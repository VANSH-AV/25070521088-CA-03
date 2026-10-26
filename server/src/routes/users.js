import { Router } from 'express';
import {
  getMyProfile,
  getPublicProfile,
  listMyProjects,
  updateMyProfile,
} from '../controllers/users.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectIdParam } from '../middleware/validate.js';
import { updateProfileSchema } from '../validators/profile.js';

export function createUserRouter() {
  const router = Router();

  router.get('/me', requireAuth, getMyProfile);
  router.patch('/me', requireAuth, validateBody(updateProfileSchema), updateMyProfile);
  router.get('/me/projects', requireAuth, listMyProjects);
  router.get('/:id', validateObjectIdParam('id'), getPublicProfile);

  return router;
}
