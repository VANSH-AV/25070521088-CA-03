import { AppError } from '../errors/AppError.js';
import { PROJECT_CATEGORIES } from '../constants/domain.js';
import { Application } from '../models/Application.js';
import { Milestone } from '../models/Milestone.js';
import { Project } from '../models/Project.js';
import { SavedProject } from '../models/SavedProject.js';
import { Task } from '../models/Task.js';
import { isProjectMember } from '../services/projects/access.js';
import { projectPeople } from '../services/projects/people.js';
import {
  assertFutureDeadline,
  assertProjectTransition,
  canManageProject,
  canViewProject,
  isPublicProject,
  openSlots,
  PUBLIC_PROJECT_STATUSES,
} from '../services/projects/policy.js';
import { exactCaseInsensitive, normalizeText } from '../utils/normalizers.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';
import { projectCard, projectDetail } from '../utils/publicData.js';

const SORTS = Object.freeze({
  newest: { createdAt: -1, _id: -1 },
  deadline: { deadline: 1, _id: 1 },
  popular: { views: -1, _id: -1 },
});

function singleQueryValue(value, field) {
  if (Array.isArray(value)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fields: { [field]: `Choose one ${field} value.` },
    });
  }

  return value;
}

function parseDiscoveryQuery(query) {
  const pagination = parsePagination(query, { defaultLimit: 12, maxLimit: 50 });
  const sort = singleQueryValue(query.sort, 'sort') ?? 'newest';
  const q = singleQueryValue(query.q, 'q');
  const skill = singleQueryValue(query.skill, 'skill');
  const tech = singleQueryValue(query.tech, 'tech');
  const category = singleQueryValue(query.category, 'category');
  const status = singleQueryValue(query.status, 'status');
  const fields = {};

  if (![...Object.keys(SORTS), 'slots'].includes(sort)) {
    throw new AppError(400, 'INVALID_SORT', 'Choose a supported project sort.');
  }

  if (q !== undefined && (typeof q !== 'string' || q.trim().length > 100)) {
    fields.q = 'Search terms must be 100 characters or fewer.';
  }

  if (skill !== undefined && (typeof skill !== 'string' || skill.trim().length > 30)) {
    fields.skill = 'Skill filters must be 30 characters or fewer.';
  }

  if (tech !== undefined && (typeof tech !== 'string' || tech.trim().length > 30)) {
    fields.tech = 'Tech filters must be 30 characters or fewer.';
  }

  if (category !== undefined && !PROJECT_CATEGORIES.includes(category)) {
    fields.category = 'Choose a valid category.';
  }

  if (status !== undefined && !PUBLIC_PROJECT_STATUSES.includes(status)) {
    fields.status = 'Choose recruiting, in progress, or completed.';
  }

  if (Object.keys(fields).length > 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fields,
    });
  }

  return {
    ...pagination,
    sort,
    q: q ? normalizeText(q) : '',
    skill: skill ? normalizeText(skill) : '',
    tech: tech ? normalizeText(tech) : '',
    category,
    status,
  };
}

function discoveryFilter({ q, skill, tech, category, status }) {
  const filter = {
    isHidden: false,
    status: status || { $in: PUBLIC_PROJECT_STATUSES },
  };

  if (category) {
    filter.category = category;
  }

  if (skill) {
    filter.requiredSkills = exactCaseInsensitive(skill);
  }

  if (tech) {
    filter.techStack = exactCaseInsensitive(tech);
  }

  if (q) {
    filter.$text = { $search: q };
  }

  return filter;
}

export async function listProjects(req, res) {
  const query = parseDiscoveryQuery(req.query);
  const filter = discoveryFilter(query);
  let projects;
  let total;

  if (query.sort === 'slots') {
    const [result] = await Project.aggregate([
      { $match: filter },
      {
        $addFields: {
          openSlots: {
            $max: [
              0,
              {
                $subtract: [
                  '$teamSize',
                  { $add: [1, { $ifNull: [{ $size: '$members' }, 0] }] },
                ],
              },
            ],
          },
          recruitingFirst: {
            $cond: [{ $eq: ['$status', 'recruiting'] }, 1, 0],
          },
        },
      },
      { $sort: { recruitingFirst: -1, openSlots: -1, createdAt: -1, _id: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: query.skip }, { $limit: query.limit }],
        },
      },
    ]);

    projects = result?.data || [];
    total = result?.metadata?.[0]?.total || 0;
  } else {
    [projects, total] = await Promise.all([
      Project.find(filter)
        .sort(SORTS[query.sort])
        .skip(query.skip)
        .limit(query.limit)
        .lean(),
      Project.countDocuments(filter),
    ]);
  }

  const people = await projectPeople(projects);

  return res.status(200).json({
    success: true,
    data: projects.map((project) => projectCard(project, people)),
    meta: paginationMeta({ page: query.page, limit: query.limit, total }),
  });
}

export async function getProject(req, res) {
  const project = await Project.findById(req.params.id)
    .populate({ path: 'owner', select: 'name avatarUrl college course graduationYear' })
    .populate({ path: 'members', select: 'name avatarUrl college course graduationYear' });

  if (!project || !canViewProject(project, req.user)) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  const publicProject = isPublicProject(project);
  const isOwner =
    req.user && String(project.owner?._id || project.owner) === req.user.id;
  const isMember = Boolean(req.user && isProjectMember(project, req.user.id));
  const application =
    req.user && !isOwner
      ? await Application.findOne({
          project: project._id,
          applicant: req.user.id,
        })
          .select('status createdAt decidedAt')
          .lean()
      : null;
  const canApply = Boolean(
    req.user &&
      req.user.role === 'student' &&
      project.status === 'recruiting' &&
      !isOwner &&
      !isMember &&
      !application &&
      openSlots(project) > 0,
  );

  if (publicProject && !isOwner) {
    await Project.updateOne({ _id: project._id }, { $inc: { views: 1 } });
    project.views += 1;
  }

  return res.status(200).json({
    success: true,
    data: {
      project: projectDetail(project),
      viewer: {
        isOwner: Boolean(isOwner),
        canManage: canManageProject(project, req.user),
        isMember,
        isAdmin: req.user?.role === 'admin',
        canApply,
        application: application
          ? {
              id: String(application._id),
              status: application.status,
              createdAt: application.createdAt || null,
              decidedAt: application.decidedAt || null,
            }
          : null,
      },
    },
  });
}

export async function createProject(req, res) {
  const body = req.body;

  if (body.status === 'recruiting') {
    assertFutureDeadline(body.deadline, { required: true });
  } else {
    assertFutureDeadline(body.deadline);
  }

  const project = await Project.create({
    ...body,
    owner: req.authUser._id,
    members: [],
  });
  const people = new Map([[req.user.id, req.authUser]]);

  return res.status(201).json({
    success: true,
    data: { project: projectDetail(project, people) },
  });
}

export async function updateProject(req, res) {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  if (!canManageProject(project, req.user)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the project owner can edit this project.');
  }

  if (project.status === 'archived') {
    throw new AppError(409, 'CONFLICT', 'Archived projects are read-only.');
  }

  const body = req.body;

  if (body.teamSize !== undefined && body.teamSize < project.members.length + 1) {
    throw new AppError(
      409,
      'TEAM_SIZE_BELOW_CURRENT',
      'Team size cannot be lower than the current team.',
    );
  }

  if (body.status) {
    assertProjectTransition(project.status, body.status);
  }

  const nextStatus = body.status || project.status;
  const nextDeadline =
    body.deadline !== undefined ? body.deadline : project.deadline;

  if (['recruiting', 'in_progress', 'completed'].includes(nextStatus)) {
    assertFutureDeadline(nextDeadline, { required: true });
  } else if (body.deadline !== undefined) {
    assertFutureDeadline(body.deadline);
  }

  Object.assign(project, body);
  await project.save();

  const people = new Map([[req.user.id, req.authUser]]);

  return res.status(200).json({
    success: true,
    data: { project: projectDetail(project, people) },
  });
}

export async function deleteProject(req, res) {
  const project = await Project.findById(req.params.id);

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  if (!canManageProject(project, req.user)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the project owner can archive this project.');
  }

  const people = new Map([[req.user.id, req.authUser]]);

  if (project.status === 'archived') {
    return res.status(200).json({
      success: true,
      data: { project: projectDetail(project, people), archived: true },
    });
  }

  const [applications, tasks, milestones] = await Promise.all([
    Application.countDocuments({ project: project._id }),
    Task.countDocuments({ project: project._id }),
    Milestone.countDocuments({ project: project._id }),
  ]);
  const untouchedDraft =
    project.status === 'draft' &&
    project.members.length === 0 &&
    applications === 0 &&
    tasks === 0 &&
    milestones === 0;

  if (untouchedDraft) {
    const snapshot = projectDetail(project, people);
    await Promise.all([
      SavedProject.deleteMany({ project: project._id }),
      project.deleteOne(),
    ]);

    return res.status(200).json({
      success: true,
      data: { project: snapshot, archived: false },
    });
  }

  assertProjectTransition(project.status, 'archived');
  project.status = 'archived';
  await project.save();

  return res.status(200).json({
    success: true,
    data: { project: projectDetail(project, people), archived: true },
  });
}
