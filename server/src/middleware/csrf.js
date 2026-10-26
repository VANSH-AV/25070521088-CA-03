import { env } from '../config/env.js';
import { AppError } from '../errors/AppError.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfProtection(req, res, next) {
  if (!WRITE_METHODS.has(req.method) || req.get('authorization')) {
    return next();
  }

  const origin = req.get('origin');

  if (!origin || !env.CLIENT_ORIGINS.includes(origin)) {
    return next(new AppError(403, 'FORBIDDEN', 'The request origin could not be verified.'));
  }

  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(new AppError(403, 'FORBIDDEN', 'The request could not be verified.'));
  }

  return next();
}
