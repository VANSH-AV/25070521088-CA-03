import { AppError } from '../../errors/AppError.js';
import { canTransitionProjectStatus } from '../../constants/domain.js';

export const PUBLIC_PROJECT_STATUSES = Object.freeze([
  'recruiting',
  'in_progress',
  'completed',
]);

export function isPublicProject(project) {
  return Boolean(
    project &&
      !project.isHidden &&
      PUBLIC_PROJECT_STATUSES.includes(project.status),
  );
}

function hasUser(project, userId) {
  if (!userId) {
    return false;
  }

  return (project.members || []).some((member) => String(member?._id || member) === String(userId));
}

export function canViewProject(project, user) {
  if (isPublicProject(project)) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  return (
    String(project.owner?._id || project.owner) === String(user.id) ||
    hasUser(project, user.id)
  );
}

export function canManageProject(project, user) {
  return Boolean(
    user &&
      user.role === 'student' &&
      String(project.owner?._id || project.owner) === String(user.id),
  );
}

export function assertProjectTransition(from, to) {
  if (!to || from === to) {
    return;
  }

  if (!canTransitionProjectStatus(from, to)) {
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `A project cannot move from ${from} to ${to}.`,
    );
  }
}

export function assertFutureDeadline(deadline, { required = false } = {}) {
  if (!deadline) {
    if (required) {
      throw new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
        fields: { deadline: 'Choose a deadline before publishing.' },
      });
    }

    return;
  }

  if (deadline.getTime() <= Date.now()) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fields: { deadline: 'Choose a deadline in the future.' },
    });
  }
}

export function openSlots(project) {
  const memberCount = 1 + (project.members?.length || 0);

  return Math.max(0, project.teamSize - memberCount);
}
