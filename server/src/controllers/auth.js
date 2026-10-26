import { AppError } from '../errors/AppError.js';
import { User } from '../models/User.js';
import { clearAuthCookie, setAuthCookie } from '../services/auth/cookie.js';
import {
  hashPassword,
  runDummyPasswordCheck,
  verifyPassword,
} from '../services/auth/password.js';
import { signAuthToken } from '../services/auth/token.js';

function startSession(res, statusCode, user) {
  setAuthCookie(res, signAuthToken(user));

  return res.status(statusCode).json({
    success: true,
    data: { user },
  });
}

export async function register(req, res) {
  const { name, email, password } = req.body;
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    email,
    passwordHash,
    role: 'student',
  });

  return startSession(res, 201, user);
}

export async function login(req, res) {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    await runDummyPasswordCheck(password);
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }

  if (!user.isActive) {
    throw new AppError(403, 'ACCOUNT_DISABLED', 'This account is disabled.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  return startSession(res, 200, user);
}

export async function logout(req, res) {
  clearAuthCookie(res);

  if (req.authUser) {
    try {
      await User.updateOne({ _id: req.authUser._id }, { $inc: { tokenVersion: 1 } });
    } catch (error) {
      console.error('[auth] failed to revoke sessions during logout', {
        requestId: req.id,
        userId: req.authUser.id,
        name: error?.name,
        message: error?.message,
      });
    }
  }

  return res.status(204).end();
}

export async function me(req, res) {
  return res.status(200).json({
    success: true,
    data: { user: req.authUser },
  });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id).select('+passwordHash');

  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  const currentPasswordMatches = await verifyPassword(currentPassword, user.passwordHash);

  if (!currentPasswordMatches) {
    throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect.');
  }

  if (await verifyPassword(newPassword, user.passwordHash)) {
    throw new AppError(
      422,
      'VALIDATION_ERROR',
      'Please correct the highlighted fields.',
      { fields: { newPassword: 'Choose a password different from your current password.' } },
    );
  }

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1;
  await user.save();

  return startSession(res, 200, user);
}
