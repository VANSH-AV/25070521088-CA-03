import { AUTH_COOKIE_NAME } from '../constants/auth.js';
import { AppError } from '../errors/AppError.js';
import { User } from '../models/User.js';
import { verifyAuthToken } from '../services/auth/token.js';

function readToken(req) {
  const authorization = req.get('authorization');

  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);

    if (!match) {
      throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
    }

    return match[1].trim();
  }

  return req.cookies?.[AUTH_COOKIE_NAME] || null;
}

async function resolveUser(req) {
  const token = readToken(req);

  if (!token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  let payload;

  try {
    payload = verifyAuthToken(token);
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  const user = await User.findById(payload.sub);

  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is disabled.');
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Your session has expired.');
  }

  req.user = {
    id: String(user._id),
    role: user.role,
    name: user.name,
  };
  req.userId = String(user._id);
  req.authUser = user;

  return user;
}

export async function requireAuth(req, res, next) {
  try {
    await resolveUser(req);
    return next();
  } catch (error) {
    return next(error);
  }
}

export async function optionalAuth(req, res, next) {
  try {
    await resolveUser(req);
  } catch (error) {
    if (!(error instanceof AppError) || ![401, 403].includes(error.statusCode)) {
      return next(error);
    }
  }

  return next();
}

export function requireRole(...roles) {
  const allowedRoles = new Set(roles);

  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
    }

    if (!allowedRoles.has(req.user.role)) {
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do that.'));
    }

    return next();
  };
}

export const requireAdmin = requireRole('admin');

export function requireSelf(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.'));
    }

    if (req.params[paramName] !== req.user.id) {
      return next(new AppError(403, 'FORBIDDEN', 'You can only access your own account.'));
    }

    return next();
  };
}
