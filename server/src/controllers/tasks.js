import { AppError } from '../errors/AppError.js';
import { TASK_STATUSES } from '../constants/domain.js';
import { Milestone } from '../models/Milestone.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import {
  assertWorkspaceReadable,
  assertWorkspaceWritable,
  isProjectMember,
  isProjectOwner,
} from '../services/projects/access.js';
import { taskData } from '../utils/collaborationData.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';
import { PUBLIC_PERSON_SELECT } from '../utils/publicData.js';

const TASK_SORTS = Object.freeze({
  order: { order: 1, createdAt: 1, _id: 1 },
  dueDate: { dueDate: 1, createdAt: 1, _id: 1 },
  createdAt: { createdAt: -1, _id: -1 },
});

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

function invalidField(field, message, code = 'VALIDATION_ERROR') {
  return new AppError(422, code, 'Please correct the highlighted fields.', {
    fields: { [field]: message },
  });
}

function queryValue(value, field) {
  if (Array.isArray(value)) {
    throw invalidField(field, `Choose one ${field} value.`);
  }

  return value;
}

function parseTaskQuery(query) {
  const pagination = parsePagination(query, { defaultLimit: 50, maxLimit: 100 });
  const status = queryValue(query.status, 'status');
  const assignee = queryValue(query.assignee, 'assignee');
  const milestone = queryValue(query.milestone, 'milestone');
  const sort = queryValue(query.sort, 'sort') || 'order';
  const filter = {};

  if (status !== undefined) {
    if (!TASK_STATUSES.includes(status)) {
      throw invalidField('status', 'Choose todo, in progress, or done.');
    }
    filter.status = status;
  }

  if (assignee !== undefined) {
    if (assignee !== 'me' && !objectIdPattern.test(assignee)) {
      throw invalidField('assignee', 'Choose a valid assignee.');
    }
    filter.assignedTo = assignee === 'me' ? query.currentUserId : assignee;
  }

  if (milestone !== undefined) {
    if (!objectIdPattern.test(milestone)) {
      throw invalidField('milestone', 'Choose a valid milestone.');
    }
    filter.milestone = milestone;
  }

  if (!TASK_SORTS[sort]) {
    throw new AppError(400, 'INVALID_SORT', 'Choose order, due date, or creation order.');
  }

  return { ...pagination, filter, sort: TASK_SORTS[sort] };
}

async function loadProject(projectId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  return project;
}

async function loadTaskProject(task) {
  const project = await Project.findById(task.project);

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  return project;
}

function assertTaskReader(project, user) {
  assertWorkspaceReadable(project, user);
}

function assertTaskWriter(project, user) {
  if (user.role === 'admin') {
    throw new AppError(403, 'ADMIN_READ_ONLY', 'Admin accounts cannot change project tasks.');
  }

  if (!isProjectOwner(project, user.id) && !isProjectMember(project, user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only project members can change tasks.');
  }

  assertWorkspaceWritable(project);
}

function isTeamMember(project, userId) {
  return isProjectOwner(project, userId) || isProjectMember(project, userId);
}

async function assertMilestone(projectId, milestoneId) {
  if (milestoneId === null) {
    return;
  }

  const milestone = await Milestone.findOne({
    _id: milestoneId,
    project: projectId,
  }).select('_id');

  if (!milestone) {
    throw invalidField(
      'milestoneId',
      'Choose a milestone from this project.',
      'INVALID_MILESTONE',
    );
  }
}

function canEditTask(task, project, user) {
  if (isProjectOwner(project, user.id)) {
    return true;
  }

  if (!isProjectMember(project, user.id)) {
    return false;
  }

  return [task.assignedTo, task.createdBy].some(
    (value) => value && String(value._id || value) === user.id,
  );
}

export async function listTasks(req, res) {
  const project = await loadProject(req.params.id);
  assertTaskReader(project, req.user);
  const query = parseTaskQuery({ ...req.query, currentUserId: req.user.id });
  const filter = { project: project._id, ...query.filter };
  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate({ path: 'assignedTo', select: PUBLIC_PERSON_SELECT })
      .sort(query.sort)
      .skip(query.skip)
      .limit(query.limit)
      .lean(),
    Task.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    data: tasks.map((task) =>
      taskData(task, { project, viewer: req.user }),
    ),
    meta: paginationMeta({ page: query.page, limit: query.limit, total }),
  });
}

export async function createTask(req, res) {
  const project = await loadProject(req.params.id);
  assertTaskWriter(project, req.user);
  const owner = isProjectOwner(project, req.user.id);
  const assignedTo = req.body.assignedTo ?? null;
  const milestoneId = req.body.milestoneId ?? null;

  if (!owner && assignedTo && String(assignedTo) !== req.user.id) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Team members can only assign tasks to themselves.',
    );
  }

  if (assignedTo) {
    if (!isTeamMember(project, assignedTo)) {
      throw invalidField('assignedTo', 'Choose a project teammate.', 'INVALID_ASSIGNEE');
    }
  }

  await assertMilestone(project._id, milestoneId);

  const task = await Task.create({
    project: project._id,
    milestone: milestoneId,
    title: req.body.title,
    description: req.body.description,
    assignedTo,
    priority: req.body.priority ?? undefined,
    dueDate: req.body.dueDate ?? null,
    order: req.body.order ?? 0,
    createdBy: req.authUser._id,
  });
  await task.populate({ path: 'assignedTo', select: PUBLIC_PERSON_SELECT });

  return res.status(201).json({
    success: true,
    data: { task: taskData(task, { project, viewer: req.user }) },
  });
}

export async function updateTask(req, res) {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'That task was not found.');
  }

  const project = await loadTaskProject(task);
  assertTaskWriter(project, req.user);
  const owner = isProjectOwner(project, req.user.id);

  if (!canEditTask(task, project, req.user)) {
    throw new AppError(403, 'FORBIDDEN', 'This task belongs to another teammate.');
  }

  if (req.body.assignedTo !== undefined) {
    const assignedTo = req.body.assignedTo;

    if (!owner && assignedTo !== null && String(assignedTo) !== req.user.id) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Team members can only assign tasks to themselves.',
      );
    }

    if (assignedTo && !isTeamMember(project, assignedTo)) {
      throw invalidField('assignedTo', 'Choose a project teammate.', 'INVALID_ASSIGNEE');
    }

    task.assignedTo = assignedTo;
  }

  if (req.body.milestoneId !== undefined) {
    await assertMilestone(project._id, req.body.milestoneId);
    task.milestone = req.body.milestoneId;
  }

  for (const field of ['title', 'description', 'status', 'priority', 'dueDate', 'order']) {
    if (req.body[field] !== undefined) {
      task[field] = req.body[field];
    }
  }

  await task.save();
  await task.populate({ path: 'assignedTo', select: PUBLIC_PERSON_SELECT });

  return res.status(200).json({
    success: true,
    data: { task: taskData(task, { project, viewer: req.user }) },
  });
}

export async function deleteTask(req, res) {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'That task was not found.');
  }

  const project = await loadTaskProject(task);

  if (req.user.role === 'admin') {
    throw new AppError(403, 'ADMIN_READ_ONLY', 'Admin accounts cannot delete project tasks.');
  }

  if (!isProjectOwner(project, req.user.id)) {
    throw new AppError(403, 'FORBIDDEN', 'Only the project owner can delete tasks.');
  }

  assertWorkspaceWritable(project);
  await task.deleteOne();

  return res.status(204).send();
}
