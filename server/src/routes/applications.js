import { Router } from 'express';
import {
  decideApplication,
  listMyApplications,
  withdrawApplication,
} from '../controllers/applications.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectIdParam } from '../middleware/validate.js';
import { applicationDecisionSchema } from '../validators/collaboration.js';

export function createApplicationRouter() {
  const router = Router();

  router.get('/me', requireAuth, listMyApplications);
  router.patch(
    '/:id/withdraw',
    requireAuth,
    validateObjectIdParam('id'),
    withdrawApplication,
  );
  router.patch(
    '/:id/decision',
    requireAuth,
    validateObjectIdParam('id'),
    validateBody(applicationDecisionSchema),
    decideApplication,
  );

  return router;
}
