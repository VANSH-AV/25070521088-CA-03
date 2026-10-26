import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

const JWT_ALGORITHM = 'HS256';

export function signAuthToken(user) {
  return jwt.sign(
    {
      role: user.role,
      tokenVersion: user.tokenVersion,
    },
    env.JWT_SECRET,
    {
      algorithm: JWT_ALGORITHM,
      subject: String(user._id),
      expiresIn: env.JWT_EXPIRES_IN,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    },
  );
}

export function verifyAuthToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: [JWT_ALGORITHM],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  if (
    typeof payload !== 'object' ||
    typeof payload.sub !== 'string' ||
    typeof payload.role !== 'string' ||
    !Number.isInteger(payload.tokenVersion)
  ) {
    throw new Error('The authentication token payload is invalid.');
  }

  return payload;
}
