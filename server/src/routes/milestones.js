import { Router } from 'express';
import { deleteMilestone, updateMilestone } from '../controllers/milestones.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectIdParam } from '../middleware/validate.js';
import { updateMilestoneSchema } from '../validators/collaboration.js';

export function createMilestoneRouter() {
  const router = Router();

  router.patch(
    '/:id',
    requireAuth,
    validateObjectIdParam('id'),
    validateBody(updateMilestoneSchema),
    updateMilestone,
  );
  router.delete(
    '/:id',
    requireAuth,
    validateObjectIdParam('id'),
    deleteMilestone,
  );

  return router;
}
