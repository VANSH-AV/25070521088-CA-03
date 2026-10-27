import { Router } from 'express';
import { deleteTask, updateTask } from '../controllers/tasks.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectIdParam } from '../middleware/validate.js';
import { updateTaskSchema } from '../validators/collaboration.js';

export function createTaskRouter() {
  const router = Router();

  router.patch(
    '/:id',
    requireAuth,
    validateObjectIdParam('id'),
    validateBody(updateTaskSchema),
    updateTask,
  );
  router.delete(
    '/:id',
    requireAuth,
    validateObjectIdParam('id'),
    deleteTask,
  );

  return router;
}
