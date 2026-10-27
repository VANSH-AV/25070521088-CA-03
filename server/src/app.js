import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { getDatabaseState } from './config/db.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './errors/errorHandler.js';
import { AppError } from './errors/AppError.js';
import { csrfProtection } from './middleware/csrf.js';
import { createRateLimiter } from './middleware/rateLimit.js';
import { requestId } from './middleware/requestId.js';
import { createApplicationRouter } from './routes/applications.js';
import { createAuthRouter } from './routes/auth.js';
import { createContactRouter } from './routes/contact.js';
import { createHealthRouter } from './routes/health.js';
import { createMilestoneRouter } from './routes/milestones.js';
import { createProjectRouter } from './routes/projects.js';
import { createTaskRouter } from './routes/tasks.js';
import { createUserRouter } from './routes/users.js';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 300;

function corsOrigin(origin, callback) {
  if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
    return callback(null, true);
  }

  return callback(new AppError(403, 'FORBIDDEN', 'The request origin is not allowed.'));
}

function requireDatabase(req, res, next) {
  if (getDatabaseState() === 'connected') {
    return next();
  }

  res.setHeader('X-Database-Ready', 'false');
  return next(new AppError(503, 'SERVICE_UNAVAILABLE', 'The database is unavailable.'));
}

export function createApp({
  databaseHealth,
  rateLimitOptions = {},
  authRateLimits = {},
  contactRateLimits = {},
} = {}) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestId);
  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Retry-After', 'X-Database-Ready'],
      maxAge: 600,
      optionsSuccessStatus: 204,
    }),
  );

  app.use(cookieParser());

  app.use(
    '/api',
    createRateLimiter({
      windowMs: DEFAULT_WINDOW_MS,
      limit: DEFAULT_LIMIT,
      ...rateLimitOptions,
    }),
  );

  app.use('/api', csrfProtection);
  app.use(express.json({ limit: '100kb', strict: true }));

  app.use('/api', createHealthRouter({ databaseHealth }));
  app.use('/api/auth', requireDatabase, createAuthRouter({ rateLimits: authRateLimits }));
  app.use('/api/users', requireDatabase, createUserRouter());
  app.use('/api/projects', requireDatabase, createProjectRouter());
  app.use('/api/applications', requireDatabase, createApplicationRouter());
  app.use('/api/tasks', requireDatabase, createTaskRouter());
  app.use('/api/milestones', requireDatabase, createMilestoneRouter());
  app.use('/api/contact', requireDatabase, createContactRouter({ rateLimits: contactRateLimits }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
