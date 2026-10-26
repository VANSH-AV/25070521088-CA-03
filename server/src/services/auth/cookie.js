import { env } from '../../config/env.js';
import { AUTH_COOKIE_NAME } from '../../constants/auth.js';
import { durationToMilliseconds } from '../../utils/duration.js';

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: durationToMilliseconds(env.JWT_EXPIRES_IN),
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions());
}

export function clearAuthCookie(res) {
  const options = authCookieOptions();
  delete options.maxAge;
  res.clearCookie(AUTH_COOKIE_NAME, options);
}
