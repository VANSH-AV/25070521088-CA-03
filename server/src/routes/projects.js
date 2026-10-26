import { Router } from 'express';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../controllers/projects.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { validateBody, validateObjectIdParam } from '../middleware/validate.js';
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
