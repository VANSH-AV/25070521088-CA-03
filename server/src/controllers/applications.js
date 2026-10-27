import { AppError } from '../errors/AppError.js';
import { APPLICATION_STATUSES } from '../constants/domain.js';
import { Application } from '../models/Application.js';
import { Project } from '../models/Project.js';
import { isProjectOwner } from '../services/projects/access.js';
import {
  acceptApplication,
  rejectApplication,
} from '../services/projects/applicationDecision.js';
import { isPublicProject, openSlots } from '../services/projects/policy.js';
import { applicationData } from '../utils/collaborationData.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';
import {
  PUBLIC_PERSON_SELECT,
  PUBLIC_USER_SELECT,
  projectDetail,
} from '../utils/publicData.js';

function applicationFilter(query) {
  if (query.status === undefined) {
    return null;
  }

  if (typeof query.status !== 'string' || !APPLICATION_STATUSES.includes(query.status)) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields.',
      { fields: { status: 'Choose a valid application status.' } },
    );
  }

  return query.status;
}

function applicationSort(query) {
  if (query.sort === undefined || query.sort === 'newest') {
    return { createdAt: -1, _id: -1 };
  }

  if (query.sort === 'oldest') {
    return { createdAt: 1, _id: 1 };
  }

  throw new AppError(400, 'INVALID_SORT', 'Choose oldest or newest application order.');
}

function notFoundProject() {
  return new AppError(404, 'NOT_FOUND', 'That project was not found.');
}

export async function createApplication(req, res) {
  if (req.user.role === 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Admin accounts cannot apply to projects.');
  }

  const project = await Project.findById(req.params.id);

  if (!project || project.isHidden) {
    throw notFoundProject();
  }

  if (isProjectOwner(project, req.user.id)) {
    throw new AppError(
      403,
      'CANNOT_APPLY_TO_OWN_PROJECT',
      'You cannot apply to your own project.',
    );
  }

  if (!isPublicProject(project)) {
    throw notFoundProject();
  }

  if (project.status !== 'recruiting') {
    throw new AppError(
      409,
      'PROJECT_NOT_RECRUITING',
      'This project is no longer accepting applications.',
    );
  }

  if ((project.members || []).some((member) => String(member) === req.user.id)) {
    throw new AppError(409, 'CONFLICT', 'You are already a member of this project.');
  }

  if (openSlots(project) === 0) {
    throw new AppError(409, 'TEAM_FULL', 'This project has no open team slots.');
  }

  const existing = await Application.findOne({
    project: project._id,
    applicant: req.user.id,
  }).select('_id');

  if (existing) {
    throw new AppError(
      409,
      'APPLICATION_ALREADY_EXISTS',
      'You have already applied to this project.',
    );
  }

  const application = await Application.create({
    project: project._id,
    applicant: req.authUser._id,
    message: req.body.message,
    relevantSkills: req.body.relevantSkills,
  });

  return res.status(201).json({
    success: true,
    data: { application: applicationData(application, { includeApplicant: false }) },
  });
}

export async function listProjectApplications(req, res) {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw notFoundProject();
  }

  const owner = isProjectOwner(project, req.user.id);

  if (!owner && req.user.role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Only the project owner can review applications.');
  }

  const status = applicationFilter(req.query);
  const sort = applicationSort(req.query);
  const pagination = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { project: project._id };

  if (status) {
    filter.status = status;
  }

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate({ path: 'applicant', select: PUBLIC_USER_SELECT })
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: applications.map((application) => ({
      ...applicationData(application),
      canDecide:
        owner &&
        application.status === 'pending' &&
        project.status === 'recruiting',
    })),
    meta: paginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  });
}

export async function listMyApplications(req, res) {
  const status = applicationFilter(req.query);
  const pagination = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { applicant: req.user.id };

  if (status) {
    filter.status = status;
  }

  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate({
        path: 'project',
        select:
          'title summary category status requiredSkills techStack teamSize members deadline owner createdAt',
        populate: [
          { path: 'owner', select: PUBLIC_PERSON_SELECT },
          { path: 'members', select: PUBLIC_PERSON_SELECT },
        ],
      })
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Application.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: applications.map((application) => ({
      ...applicationData(application, { includeApplicant: false }),
      canWithdraw: application.status === 'pending',
    })),
    meta: paginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  });
}

export async function withdrawApplication(req, res) {
  const application = await Application.findById(req.params.id);

  if (!application) {
    throw new AppError(404, 'NOT_FOUND', 'That application was not found.');
  }

  if (String(application.applicant) !== req.user.id) {
    throw new AppError(403, 'FORBIDDEN', 'You can only withdraw your own application.');
  }

  const withdrawn = await Application.findOneAndUpdate(
    { _id: application._id, status: 'pending' },
    {
      $set: {
        status: 'withdrawn',
        decidedBy: req.authUser._id,
        decidedAt: new Date(),
      },
    },
    { returnDocument: 'after' },
  );

  if (!withdrawn) {
    throw new AppError(
      409,
      'APPLICATION_ALREADY_DECIDED',
      'This application has already been decided.',
    );
  }

  return res.status(200).json({
    success: true,
    data: {
      application: {
        ...applicationData(withdrawn, { includeApplicant: false }),
        canWithdraw: false,
      },
    },
  });
}

export async function decideApplication(req, res) {
  if (req.user.role === 'admin') {
    throw new AppError(403, 'ADMIN_READ_ONLY', 'Admin accounts can only review applications.');
  }

  const decision = req.body.decision;
  const result =
    decision === 'accepted'
      ? await acceptApplication(req.params.id, req.user.id)
      : await rejectApplication(req.params.id, req.user.id);

  const [application, project] = await Promise.all([
    Application.findById(result.application._id)
      .populate({ path: 'applicant', select: PUBLIC_USER_SELECT })
      .lean(),
    Project.findById(result.project?._id || result.application.project)
      .populate({ path: 'owner', select: PUBLIC_PERSON_SELECT })
      .populate({ path: 'members', select: PUBLIC_PERSON_SELECT })
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      application: applicationData(application),
      project: projectDetail(project),
    },
  });
}
