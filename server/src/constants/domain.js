export const USER_ROLES = Object.freeze(['student', 'admin']);
export const AVAILABILITY_STATUSES = Object.freeze(['open', 'limited', 'unavailable']);

export const PROJECT_STATUSES = Object.freeze([
  'draft',
  'recruiting',
  'in_progress',
  'completed',
  'archived',
]);

export const PROJECT_CATEGORIES = Object.freeze([
  'web',
  'mobile',
  'ai_ml',
  'data',
  'design',
  'hardware',
  'research',
  'other',
]);

export const APPLICATION_STATUSES = Object.freeze([
  'pending',
  'accepted',
  'rejected',
  'withdrawn',
]);

export const TASK_STATUSES = Object.freeze(['todo', 'in_progress', 'done']);
export const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high']);
export const MILESTONE_STATUSES = Object.freeze(['planned', 'active', 'completed']);

export const NOTIFICATION_TYPES = Object.freeze([
  'application_received',
  'application_accepted',
  'application_rejected',
  'task_assigned',
  'milestone_due',
  'project_completed',
  'report_resolved',
  'system',
]);

export const NOTIFICATION_ENTITY_TYPES = Object.freeze([
  'project',
  'application',
  'task',
  'milestone',
  'user',
  'report',
  'system',
]);

export const CONTACT_MESSAGE_STATUSES = Object.freeze([
  'new',
  'in_review',
  'resolved',
  'spam',
]);

export const REPORT_TARGET_TYPES = Object.freeze(['project', 'user']);
export const REPORT_REASONS = Object.freeze([
  'spam',
  'harassment',
  'inappropriate',
  'misleading',
  'impersonation',
  'other',
]);
export const REPORT_STATUSES = Object.freeze(['open', 'reviewing', 'resolved', 'dismissed']);

export const PROJECT_STATUS_TRANSITIONS = Object.freeze({
  draft: Object.freeze(['recruiting', 'archived']),
  recruiting: Object.freeze(['in_progress', 'completed', 'archived']),
  in_progress: Object.freeze(['completed', 'archived']),
  completed: Object.freeze(['archived']),
  archived: Object.freeze([]),
});

export const APPLICATION_STATUS_TRANSITIONS = Object.freeze({
  pending: Object.freeze(['accepted', 'rejected', 'withdrawn']),
  accepted: Object.freeze([]),
  rejected: Object.freeze([]),
  withdrawn: Object.freeze([]),
});

export const REPORT_STATUS_TRANSITIONS = Object.freeze({
  open: Object.freeze(['reviewing', 'resolved', 'dismissed']),
  reviewing: Object.freeze(['resolved', 'dismissed']),
  resolved: Object.freeze([]),
  dismissed: Object.freeze([]),
});

export function canTransition(transitions, from, to) {
  return Boolean(transitions[from]?.includes(to));
}

export function canTransitionProjectStatus(from, to) {
  return canTransition(PROJECT_STATUS_TRANSITIONS, from, to);
}

export function canTransitionApplicationStatus(from, to) {
  return canTransition(APPLICATION_STATUS_TRANSITIONS, from, to);
}

export function canTransitionReportStatus(from, to) {
  return canTransition(REPORT_STATUS_TRANSITIONS, from, to);
}
