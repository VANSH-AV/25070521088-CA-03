import { AppError } from '../errors/AppError.js';
import { PROJECT_STATUSES } from '../constants/domain.js';
import { Project } from '../models/Project.js';
import { User } from '../models/User.js';
import { projectPeople } from '../services/projects/people.js';
import { PUBLIC_PROJECT_STATUSES } from '../services/projects/policy.js';
import { paginationMeta, parsePagination } from '../utils/pagination.js';
import {
  projectCard,
  privateUser,
  publicUser,
  PUBLIC_USER_SELECT,
} from '../utils/publicData.js';

export async function getMyProfile(req, res) {
  const [ownedProjects, memberProjects] = await Promise.all([
    Project.countDocuments({ owner: req.authUser._id }),
    Project.countDocuments({ members: req.authUser._id }),
  ]);

  return res.status(200).json({
    success: true,
    data: {
      user: privateUser(req.authUser),
      counts: { ownedProjects, memberProjects },
    },
  });
}

export async function updateMyProfile(req, res) {
  const { links, ...fields } = req.body;
  const user = req.authUser;

  Object.assign(user, fields);

  if (links) {
    for (const [key, value] of Object.entries(links)) {
      user.set(`links.${key}`, value);
    }
  }

  await user.save();

  return res.status(200).json({
    success: true,
    data: { user: privateUser(user) },
  });
}

export async function getPublicProfile(req, res) {
  const user = await User.findOne({
    _id: req.params.id,
    isActive: true,
    role: 'student',
  }).select(PUBLIC_USER_SELECT);

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'That student profile was not found.');
  }

  const projects = await Project.find({
    owner: user._id,
    isHidden: false,
    status: { $in: PUBLIC_PROJECT_STATUSES },
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(12)
    .lean();

  const people = await projectPeople(projects);

  return res.status(200).json({
    success: true,
    data: {
      user: publicUser(user),
      projects: projects.map((project) => projectCard(project, people)),
    },
  });
}

export async function listMyProjects(req, res) {
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 12,
    maxLimit: 50,
  });
  const role = req.query.role ?? 'all';
  const status = req.query.status;

  if (!['all', 'owned', 'member'].includes(role)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fields: { role: 'Choose owned, member, or all.' },
    });
  }

  if (status !== undefined && !PROJECT_STATUSES.includes(status)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
      fields: { status: 'Choose a valid project status.' },
    });
  }

  const access =
    role === 'owned'
      ? { owner: req.authUser._id }
      : role === 'member'
        ? { members: req.authUser._id }
        : { $or: [{ owner: req.authUser._id }, { members: req.authUser._id }] };
  const filter = { ...access, ...(status ? { status } : {}) };

  const [projects, total] = await Promise.all([
    Project.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);
  const people = await projectPeople(projects);

  return res.status(200).json({
    success: true,
    data: projects.map((project) => ({
      ...projectCard(project, people),
      role: String(project.owner) === req.user.id ? 'owner' : 'member',
    })),
    meta: paginationMeta({ page, limit, total }),
  });
}
