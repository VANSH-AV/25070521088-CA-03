import { publicPerson, publicUser, projectCard } from './publicData.js';
import { isProjectOwner } from '../services/projects/access.js';

function idOf(value) {
  return value ? String(value?._id || value) : null;
}

function projectSummary(project) {
  return project && typeof project === 'object' && project.title
    ? projectCard(project)
    : idOf(project);
}

export function applicationData(application, { includeApplicant = true } = {}) {
  return {
    id: idOf(application),
    project: projectSummary(application.project),
    applicant:
      includeApplicant && application.applicant && typeof application.applicant === 'object'
        ? publicUser(application.applicant)
        : idOf(application.applicant),
    message: application.message,
    relevantSkills: application.relevantSkills || [],
    status: application.status,
    decidedAt: application.decidedAt || null,
    createdAt: application.createdAt || null,
    updatedAt: application.updatedAt || null,
  };
}

export function taskData(task, { project, viewer } = {}) {
  const owner = project ? isProjectOwner(project, viewer?.id) : false;
  const assignedToId = idOf(task.assignedTo);
  const createdById = idOf(task.createdBy);
  const isParticipant = Boolean(
    viewer &&
      (owner ||
        assignedToId === String(viewer.id) ||
        createdById === String(viewer.id)),
  );
  const writable = Boolean(
    viewer &&
      viewer.role === 'student' &&
      project &&
      project.status !== 'archived' &&
      (owner || isParticipant),
  );

  return {
    id: idOf(task),
    project: idOf(task.project),
    milestoneId: idOf(task.milestone),
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    assignedTo:
      task.assignedTo && typeof task.assignedTo === 'object'
        ? publicPerson(task.assignedTo)
        : null,
    dueDate: task.dueDate || null,
    completedAt: task.completedAt || null,
    order: task.order || 0,
    isOverdue: Boolean(
      task.dueDate && task.status !== 'done' && task.dueDate.getTime() < Date.now(),
    ),
    permissions: {
      canEdit: writable,
      canDelete: Boolean(owner && project.status !== 'archived'),
    },
    createdAt: task.createdAt || null,
    updatedAt: task.updatedAt || null,
  };
}

export function milestoneData(milestone, counts = {}) {
  const taskCount = counts.taskCount || 0;
  const doneTaskCount = counts.doneTaskCount || 0;

  return {
    id: idOf(milestone),
    project: idOf(milestone.project),
    title: milestone.title,
    description: milestone.description || '',
    dueDate: milestone.dueDate || null,
    status: milestone.status,
    order: milestone.order || 0,
    completedAt: milestone.completedAt || null,
    taskCount,
    doneTaskCount,
    progress: taskCount === 0 ? 0 : Math.round((doneTaskCount / taskCount) * 100),
    createdAt: milestone.createdAt || null,
    updatedAt: milestone.updatedAt || null,
  };
}
