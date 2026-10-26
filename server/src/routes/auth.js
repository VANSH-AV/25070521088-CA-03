import { Router } from 'express';
import {
  changePassword,
  login,
  logout,
  me,
  register,
} from '../controllers/auth.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { createRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
} from '../validators/auth.js';

const HOUR_MS = 60 * 60 * 1000;
const QUARTER_HOUR_MS = 15 * 60 * 1000;

export function createAuthRouter({ rateLimits = {} } = {}) {
  const router = Router();

  const registerLimiter = createRateLimiter({
    windowMs: HOUR_MS,
    limit: 5,
    message: 'Too many accounts were created from this address. Try again later.',
    ...rateLimits.register,
  });
  const loginLimiter = createRateLimiter({
    windowMs: QUARTER_HOUR_MS,
    limit: 10,
    message: 'Too many sign-in attempts. Try again later.',
    ...rateLimits.login,
  });
  const passwordLimiter = createRateLimiter({
    windowMs: QUARTER_HOUR_MS,
    limit: 10,
    message: 'Too many password attempts. Try again later.',
    ...rateLimits.password,
  });

  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  router.post(
    '/register',
    registerLimiter,
    validateBody(registerSchema),
    register,
  );
  router.post('/login', loginLimiter, validateBody(loginSchema), login);
  router.post('/logout', optionalAuth, logout);
  router.get('/me', requireAuth, me);
  router.patch(
    '/password',
    passwordLimiter,
    requireAuth,
    validateBody(changePasswordSchema),
    changePassword,
  );

  return router;
}
