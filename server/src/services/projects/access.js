import { AppError } from '../../errors/AppError.js';

export function isProjectOwner(project, userId) {
  return Boolean(
    project && userId && String(project.owner?._id || project.owner) === String(userId),
  );
}

export function isProjectMember(project, userId) {
  if (!project || !userId) {
    return false;
  }

  return (project.members || []).some(
    (member) => String(member?._id || member) === String(userId),
  );
}

export function isProjectParticipant(project, userId) {
  return isProjectOwner(project, userId) || isProjectMember(project, userId);
}

export function assertWorkspaceReadable(project, user) {
  if (user.role === 'admin' || isProjectParticipant(project, user.id)) {
    return;
  }

  throw new AppError(403, 'FORBIDDEN', 'Only project members can open this workspace.');
}

export function assertWorkspaceWritable(project) {
  if (project.status === 'archived') {
    throw new AppError(409, 'CONFLICT', 'Archived projects are read-only.');
  }
}

export function assertProjectOwner(project, user) {
  if (user.role === 'admin') {
    throw new AppError(403, 'ADMIN_READ_ONLY', 'Admin accounts cannot change project data.');
  }

  if (!isProjectOwner(project, user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the project owner can do that.');
  }
}
