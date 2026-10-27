import { AppError } from '../errors/AppError.js';
import { Milestone } from '../models/Milestone.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import {
  assertProjectOwner,
  assertWorkspaceReadable,
  assertWorkspaceWritable,
} from '../services/projects/access.js';
import { milestoneData } from '../utils/collaborationData.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';

const MILESTONE_SORTS = Object.freeze({
  order: { order: 1, createdAt: 1, _id: 1 },
  dueDate: { dueDate: 1, createdAt: 1, _id: 1 },
});

async function loadProject(projectId) {
  const project = await Project.findById(projectId);

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  return project;
}

async function countsByMilestone(milestoneIds) {
  if (milestoneIds.length === 0) {
    return new Map();
  }

  const rows = await Task.aggregate([
    { $match: { milestone: { $in: milestoneIds } } },
    {
      $group: {
        _id: '$milestone',
        taskCount: { $sum: 1 },
        doneTaskCount: {
          $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] },
        },
      },
    },
  ]);

  return new Map(rows.map((row) => [String(row._id), row]));
}

async function oneMilestoneCounts(milestoneId) {
  const counts = await countsByMilestone([milestoneId]);
  return counts.get(String(milestoneId)) || {};
}

export async function listMilestones(req, res) {
  const project = await loadProject(req.params.id);
  assertWorkspaceReadable(project, req.user);
  const pagination = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const sortName = req.query.sort === undefined ? 'order' : req.query.sort;

  if (typeof sortName !== 'string' || !MILESTONE_SORTS[sortName]) {
    throw new AppError(400, 'INVALID_SORT', 'Choose order or due date.');
  }

  const [milestones, total] = await Promise.all([
    Milestone.find({ project: project._id })
      .sort(MILESTONE_SORTS[sortName])
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Milestone.countDocuments({ project: project._id }),
  ]);
  const counts = await countsByMilestone(milestones.map((milestone) => milestone._id));

  return res.status(200).json({
    success: true,
    data: milestones.map((milestone) =>
      milestoneData(milestone, counts.get(String(milestone._id))),
    ),
    meta: paginationMeta({
      page: pagination.page,
      limit: pagination.limit,
      total,
    }),
  });
}

export async function createMilestone(req, res) {
  const project = await loadProject(req.params.id);
  assertProjectOwner(project, req.user);
  assertWorkspaceWritable(project);
  const milestone = await Milestone.create({
    project: project._id,
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate ?? null,
    status: req.body.status,
    order: req.body.order ?? 0,
    createdBy: req.authUser._id,
  });

  return res.status(201).json({
    success: true,
    data: { milestone: milestoneData(milestone) },
  });
}

export async function updateMilestone(req, res) {
  const milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    throw new AppError(404, 'NOT_FOUND', 'That milestone was not found.');
  }

  const project = await loadProject(milestone.project);
  assertProjectOwner(project, req.user);
  assertWorkspaceWritable(project);

  for (const field of ['title', 'description', 'dueDate', 'status', 'order']) {
    if (req.body[field] !== undefined) {
      milestone[field] = req.body[field];
    }
  }

  await milestone.save();
  const counts = await oneMilestoneCounts(milestone._id);

  return res.status(200).json({
    success: true,
    data: { milestone: milestoneData(milestone, counts) },
  });
}

export async function deleteMilestone(req, res) {
  const milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    throw new AppError(404, 'NOT_FOUND', 'That milestone was not found.');
  }

  const project = await loadProject(milestone.project);
  assertProjectOwner(project, req.user);
  assertWorkspaceWritable(project);
  const taskCount = await Task.countDocuments({ milestone: milestone._id });

  if (taskCount > 0) {
    throw new AppError(
      409,
      'MILESTONE_HAS_TASKS',
      'Move or unassign this milestone’s tasks before deleting it.',
    );
  }

  await milestone.deleteOne();
  return res.status(204).send();
}
