import { rateLimit } from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

export function rateLimitHandler(windowMs, message) {
  return (req, res, next) => {
    const resetTime = req.rateLimit?.resetTime;
    const retryAfter = resetTime
      ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000))
      : Math.ceil(windowMs / 1000);

    res.setHeader('Retry-After', String(retryAfter));
    next(new AppError(429, 'RATE_LIMITED', message));
  };
}

export function createRateLimiter({
  windowMs,
  limit,
  message = 'Too many requests. Try again later.',
  ...options
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler(windowMs, message),
    ...options,
  });
}
