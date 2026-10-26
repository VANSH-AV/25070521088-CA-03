import { Router } from 'express';
import { createContactMessage } from '../controllers/contact.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { contactSchema } from '../validators/contact.js';

const HOUR_MS = 60 * 60 * 1000;

export function createContactRouter({ rateLimits = {} } = {}) {
  const router = Router();
  const limiter = createRateLimiter({
    windowMs: HOUR_MS,
    limit: 5,
    message: 'Too many messages were sent from this address. Try again later.',
    ...rateLimits.contact,
  });

  router.post('/', limiter, validateBody(contactSchema), createContactMessage);

  return router;
}
