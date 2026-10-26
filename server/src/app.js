import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './errors/errorHandler.js';
import { AppError } from './errors/AppError.js';
import { requestId } from './middleware/requestId.js';
import { createHealthRouter } from './routes/health.js';

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 300;

function corsOrigin(origin, callback) {
  if (!origin || env.CLIENT_ORIGINS.includes(origin)) {
    return callback(null, true);
  }

  return callback(new AppError(403, 'FORBIDDEN', 'The request origin is not allowed.'));
}

function rateLimitHandler(req, res, next) {
  const resetTime = req.rateLimit?.resetTime;
  const retryAfter = resetTime
    ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
    : Math.ceil(DEFAULT_WINDOW_MS / 1000);

  res.setHeader('Retry-After', String(retryAfter));
  next(new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again later.'));
}

export function createApp({ databaseHealth, rateLimitOptions = {} } = {}) {
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

  app.use(
    '/api',
    rateLimit({
      windowMs: DEFAULT_WINDOW_MS,
      limit: DEFAULT_LIMIT,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      ...rateLimitOptions,
      handler: rateLimitHandler,
    }),
  );

  app.use(express.json({ limit: '100kb', strict: true }));

  app.use('/api', createHealthRouter({ databaseHealth }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
