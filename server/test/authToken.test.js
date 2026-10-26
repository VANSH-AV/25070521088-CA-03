import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { env } from '../src/config/env.js';
import { authCookieOptions } from '../src/services/auth/cookie.js';
import { signAuthToken, verifyAuthToken } from '../src/services/auth/token.js';

const user = {
  _id: '507f1f77bcf86cd799439011',
  role: 'student',
  tokenVersion: 3,
};

describe('authentication token service', () => {
  it('signs and verifies the expected claims with an HS256 cookie contract', () => {
    const token = signAuthToken(user);
    const payload = verifyAuthToken(token);
    const options = authCookieOptions();

    expect(payload).toMatchObject({
      sub: user._id,
      role: 'student',
      tokenVersion: 3,
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    });
    expect(payload.exp).toBeGreaterThan(payload.iat);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  it('rejects tampered, expired, and incorrectly scoped tokens', () => {
    const token = signAuthToken(user);
    const [header, payload, signature] = token.split('.');
    const tampered = `${header}.${payload}.${signature.slice(0, -1)}x`;

    expect(() => verifyAuthToken(tampered)).toThrow();

    const expired = jwt.sign({ role: 'student', tokenVersion: 0 }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: user._id,
      expiresIn: -1,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    expect(() => verifyAuthToken(expired)).toThrow();

    const wrongIssuer = jwt.sign({ role: 'student', tokenVersion: 0 }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: user._id,
      expiresIn: '5m',
      issuer: 'another-api',
      audience: env.JWT_AUDIENCE,
    });

    expect(() => verifyAuthToken(wrongIssuer)).toThrow();

    const wrongAudience = jwt.sign({ role: 'student', tokenVersion: 0 }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: user._id,
      expiresIn: '5m',
      issuer: env.JWT_ISSUER,
      audience: 'another-web',
    });

    expect(() => verifyAuthToken(wrongAudience)).toThrow();
  });

  it('rejects unsigned tokens and payloads missing required claims', () => {
    const unsigned = jwt.sign({ role: 'admin', tokenVersion: 0 }, '', {
      algorithm: 'none',
      subject: user._id,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    expect(() => verifyAuthToken(unsigned)).toThrow();

    const missingVersion = jwt.sign({ role: 'student' }, env.JWT_SECRET, {
      algorithm: 'HS256',
      subject: user._id,
      expiresIn: '5m',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    });

    expect(() => verifyAuthToken(missingVersion)).toThrow('token payload is invalid');
  });
});
