import mongoose from 'mongoose';
import { AppError } from '../../errors/AppError.js';
import { Application } from '../../models/Application.js';
import { Project } from '../../models/Project.js';
import { isProjectMember, isProjectOwner } from './access.js';

function alreadyDecidedError() {
  return new AppError(
    409,
    'APPLICATION_ALREADY_DECIDED',
    'This application has already been decided.',
  );
}

function notRecruitingError() {
  return new AppError(
    409,
    'PROJECT_NOT_RECRUITING',
    'This project is no longer accepting applications.',
  );
}

function teamFullError() {
  return new AppError(409, 'TEAM_FULL', 'This project has no open team slots.');
}

async function supportsTransactions() {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    return Boolean(hello.setName || hello.msg === 'isdbgrid');
  } catch {
    return false;
  }
}

async function loadDecisionContext(applicationId, ownerId, session) {
  const applicationQuery = Application.findById(applicationId);

  if (session) {
    applicationQuery.session(session);
  }

  const application = await applicationQuery;

  if (!application) {
    throw new AppError(404, 'NOT_FOUND', 'That application was not found.');
  }

  const projectLookup = Project.findById(application.project);

  if (session) {
    projectLookup.session(session);
  }

  const project = await projectLookup;

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  if (!isProjectOwner(project, ownerId)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the project owner can decide applications.');
  }

  if (project.status !== 'recruiting') {
    throw notRecruitingError();
  }

  if (application.status !== 'pending') {
    throw alreadyDecidedError();
  }

  if (isProjectMember(project, application.applicant)) {
    throw new AppError(409, 'CONFLICT', 'That applicant is already on the team.');
  }

  if (String(application.applicant) === String(project.owner)) {
    throw new AppError(403, 'CANNOT_APPLY_TO_OWN_PROJECT', 'You cannot apply to your own project.');
  }

  return { application, project };
}

function memberPipeline(applicantId) {
  const memberId = new mongoose.Types.ObjectId(applicantId);
  const nextMembers = {
    $setUnion: [{ $ifNull: ['$members', []] }, [memberId]],
  };

  return [
    {
      $set: {
        members: nextMembers,
        status: {
          $cond: [
            { $gte: [{ $add: [1, { $size: nextMembers }] }, '$teamSize'] },
            'in_progress',
            '$status',
          ],
        },
        updatedAt: '$$NOW',
      },
    },
  ];
}

async function addAcceptedMember(projectId, applicantId, session) {
  const applicantObjectId = new mongoose.Types.ObjectId(applicantId);
  const query = Project.findOneAndUpdate(
    {
      _id: projectId,
      status: 'recruiting',
      members: { $ne: applicantObjectId },
      $expr: {
        $lt: [
          { $add: [1, { $size: { $ifNull: ['$members', []] } }] },
          '$teamSize',
        ],
      },
    },
    memberPipeline(applicantId),
    { returnDocument: 'after', session, runValidators: false, updatePipeline: true },
  );

  if (session) {
    query.session(session);
  }

  return query;
}

async function explainMembershipFailure(projectId, applicantId, session) {
  const query = Project.findById(projectId);

  if (session) {
    query.session(session);
  }

  const project = await query;

  if (!project) {
    return new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  if (project.status !== 'recruiting') {
    return notRecruitingError();
  }

  if (isProjectMember(project, applicantId)) {
    return new AppError(409, 'CONFLICT', 'That applicant is already on the team.');
  }

  return teamFullError();
}

async function performAccept(applicationId, ownerId, session) {
  const { application } = await loadDecisionContext(applicationId, ownerId, session);
  const decidedAt = new Date();
  const claim = Application.findOneAndUpdate(
    { _id: application._id, status: 'pending' },
    { $set: { status: 'accepted', decidedBy: ownerId, decidedAt } },
    { returnDocument: 'after', session, runValidators: false },
  );

  if (session) {
    claim.session(session);
  }

  const accepted = await claim;

  if (!accepted) {
    throw alreadyDecidedError();
  }

  const project = await addAcceptedMember(application.project, application.applicant, session);

  if (!project) {
    throw await explainMembershipFailure(
      application.project,
      application.applicant,
      session,
    );
  }

  return { application: accepted, project };
}

async function acceptWithTransaction(applicationId, ownerId) {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await performAccept(applicationId, ownerId, session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function rollbackAccept(applicationId, ownerId) {
  try {
    await Application.updateOne(
      { _id: applicationId, status: 'accepted', decidedBy: ownerId },
      { $set: { status: 'pending', decidedBy: null, decidedAt: null } },
    );
  } catch (error) {
    console.error('[applications] accept rollback failed', {
      applicationId,
      name: error?.name,
    });
  }
}

async function acceptWithoutTransaction(applicationId, ownerId) {
  const { application } = await loadDecisionContext(applicationId, ownerId);
  const decidedAt = new Date();
  const accepted = await Application.findOneAndUpdate(
    { _id: application._id, status: 'pending' },
    { $set: { status: 'accepted', decidedBy: ownerId, decidedAt } },
    { returnDocument: 'after', runValidators: false },
  );

  if (!accepted) {
    throw alreadyDecidedError();
  }

  let project;

  try {
    project = await addAcceptedMember(application.project, application.applicant);
  } catch (error) {
    await rollbackAccept(accepted._id, ownerId);
    throw error;
  }

  if (!project) {
    await rollbackAccept(accepted._id, ownerId);
    throw await explainMembershipFailure(application.project, application.applicant);
  }

  return { application: accepted, project };
}

export async function acceptApplication(applicationId, ownerId) {
  if (await supportsTransactions()) {
    return acceptWithTransaction(applicationId, ownerId);
  }

  return acceptWithoutTransaction(applicationId, ownerId);
}

export async function rejectApplication(applicationId, ownerId) {
  const { application } = await loadDecisionContext(applicationId, ownerId);
  const rejected = await Application.findOneAndUpdate(
    { _id: application._id, status: 'pending' },
    { $set: { status: 'rejected', decidedBy: ownerId, decidedAt: new Date() } },
    { returnDocument: 'after', runValidators: false },
  );

  if (!rejected) {
    throw alreadyDecidedError();
  }

  return { application: rejected };
}
