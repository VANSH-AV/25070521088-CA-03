import { AppError } from '../errors/AppError.js';
import { Application } from '../models/Application.js';
import { Milestone } from '../models/Milestone.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import {
  assertWorkspaceReadable,
  isProjectMember,
  isProjectOwner,
} from '../services/projects/access.js';
import { projectDetail, publicUser, PUBLIC_USER_SELECT } from '../utils/publicData.js';

export async function getWorkspace(req, res) {
  const project = await Project.findById(req.params.id)
    .populate({ path: 'owner', select: PUBLIC_USER_SELECT })
    .populate({ path: 'members', select: PUBLIC_USER_SELECT });

  if (!project) {
    throw new AppError(404, 'NOT_FOUND', 'That project was not found.');
  }

  assertWorkspaceReadable(project, req.user);

  const owner = isProjectOwner(project, req.user.id);
  const member = isProjectMember(project, req.user.id);
  const admin = req.user.role === 'admin';
  const readOnly = admin || project.status === 'archived';
  const [taskCount, doneTaskCount, milestoneCount, completedMilestoneCount, pendingApplications] =
    await Promise.all([
      Task.countDocuments({ project: project._id }),
      Task.countDocuments({ project: project._id, status: 'done' }),
      Milestone.countDocuments({ project: project._id }),
      Milestone.countDocuments({ project: project._id, status: 'completed' }),
      owner || admin
        ? Application.countDocuments({ project: project._id, status: 'pending' })
        : Promise.resolve(0),
    ]);
  const team = [
    ...(project.owner
      ? [{ ...publicUser(project.owner), role: 'owner' }]
      : []),
    ...(project.members || []).map((person) => ({
      ...publicUser(person),
      role: 'member',
    })),
  ];

  return res.status(200).json({
    success: true,
    data: {
      project: projectDetail(project),
      team,
      counts: {
        members: team.length,
        tasks: taskCount,
        doneTasks: doneTaskCount,
        milestones: milestoneCount,
        completedMilestones: completedMilestoneCount,
        pendingApplications,
      },
      progress: {
        percent: taskCount === 0 ? 0 : Math.round((doneTaskCount / taskCount) * 100),
        doneTasks: doneTaskCount,
        totalTasks: taskCount,
      },
      permissions: {
        isOwner: owner,
        isMember: member,
        isAdmin: admin,
        readOnly,
        canManageProject: owner && !readOnly,
        canReviewApplications: owner && !readOnly,
        canCreateTasks: (owner || member) && !readOnly,
        canManageMilestones: owner && !readOnly,
      },
    },
  });
}
