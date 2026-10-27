import { Router } from 'express';
import {
  createApplication,
  listProjectApplications,
} from '../controllers/applications.js';
import { createMilestone, listMilestones } from '../controllers/milestones.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../controllers/projects.js';
import { createTask, listTasks } from '../controllers/tasks.js';
import { getWorkspace } from '../controllers/workspace.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateObjectIdParam } from '../middleware/validate.js';
import {
  createApplicationSchema,
  createMilestoneSchema,
  createTaskSchema,
} from '../validators/collaboration.js';
import {
  createProjectSchema,
  updateProjectSchema,
} from '../validators/project.js';

export function createProjectRouter() {
  const router = Router();

  router.get('/', listProjects);
  router.post(
    '/',
    requireAuth,
    requireRole('student'),
    validateBody(createProjectSchema),
    createProject,
  );
  router.get(
    '/:id/workspace',
    requireAuth,
    validateObjectIdParam('id'),
    getWorkspace,
  );
  router.get(
    '/:id/applications',
    requireAuth,
    validateObjectIdParam('id'),
    listProjectApplications,
  );
  router.post(
    '/:id/applications',
    requireAuth,
    requireRole('student'),
    validateObjectIdParam('id'),
    validateBody(createApplicationSchema),
    createApplication,
  );
  router.get(
    '/:id/tasks',
    requireAuth,
    validateObjectIdParam('id'),
    listTasks,
  );
  router.post(
    '/:id/tasks',
    requireAuth,
    validateObjectIdParam('id'),
    validateBody(createTaskSchema),
    createTask,
  );
  router.get(
    '/:id/milestones',
    requireAuth,
    validateObjectIdParam('id'),
    listMilestones,
  );
  router.post(
    '/:id/milestones',
    requireAuth,
    validateObjectIdParam('id'),
    validateBody(createMilestoneSchema),
    createMilestone,
  );
  router.get('/:id', optionalAuth, validateObjectIdParam('id'), getProject);
  router.patch(
    '/:id',
    requireAuth,
    requireRole('student'),
    validateObjectIdParam('id'),
    validateBody(updateProjectSchema),
    updateProject,
  );
  router.delete(
    '/:id',
    requireAuth,
    requireRole('student'),
    validateObjectIdParam('id'),
    deleteProject,
  );

  return router;
}
