import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import {
  requireAdmin,
  requireRole,
  requireSelf,
} from '../src/middleware/auth.js';
import { User } from '../src/models/User.js';

const CLIENT_ORIGIN = 'http://localhost:5173';
const writeHeaders = {
  Origin: CLIENT_ORIGIN,
  'X-Requested-With': 'XMLHttpRequest',
};

const validRegistration = {
  name: 'Mira Shah',
  email: 'mira@example.com',
  password: 'CampusLoop9',
};

let mongoServer;

function connectedDatabase() {
  return Promise.resolve({ connected: true, state: 'connected' });
}

function makeApp(options = {}) {
  return createApp({ databaseHealth: connectedDatabase, ...options });
}

function cookiePair(response) {
  const setCookie = response.headers['set-cookie'] || [];
  const cookie = setCookie.find((value) => value.startsWith('flexi_token='));

  return cookie ? cookie.split(';')[0] : null;
}

function register(agent, overrides = {}) {
  return agent
    .post('/api/auth/register')
    .set(writeHeaders)
    .send({ ...validRegistration, ...overrides });
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await connectDatabase({ uri: mongoServer.getUri(), dbName: 'flexi_auth_test' });
  await User.init();
}, 120000);

afterAll(async () => {
  await disconnectDatabase();

  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('registration and login', () => {
  it('registers a student, stores a cost-12 hash, and sets an httpOnly cookie', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    const response = await register(agent);

    expect(response.status).toBe(201);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      name: validRegistration.name,
      email: validRegistration.email,
      role: 'student',
      isActive: true,
    });
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.tokenVersion).toBeUndefined();

    const stored = await User.findOne({ email: validRegistration.email }).select('+passwordHash');
    expect(stored.passwordHash).not.toBe(validRegistration.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$12\$/);

    const cookie = response.headers['set-cookie'].find((value) =>
      value.startsWith('flexi_token='),
    );

    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).toMatch(/Max-Age=604800/i);
    expect(cookie).not.toMatch(/Secure/i);
  });

  it('rejects duplicate emails case-insensitively with a safe error', async () => {
    const app = makeApp();
    await register(request(app));

    const duplicate = await register(request(app), {
      email: 'MIRA@EXAMPLE.COM',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toEqual({
      code: 'EMAIL_IN_USE',
      message: 'An account with that email already exists.',
    });
  });

  it('rejects weak, oversized, and privileged registration payloads', async () => {
    const app = makeApp();
    const agent = request.agent(app);

    const weak = await register(agent, { password: 'short1' });
    expect(weak.status).toBe(422);
    expect(weak.body.error.fields).toHaveProperty('password');

    const noNumber = await register(agent, { password: 'OnlyLettersHere' });
    expect(noNumber.status).toBe(422);
    expect(noNumber.body.error.fields).toHaveProperty('password');

    const tooLong = await register(agent, { password: `${'a'.repeat(72)}1` });
    expect(tooLong.status).toBe(422);
    expect(tooLong.body.error.fields).toHaveProperty('password');

    const privileged = await register(agent, { role: 'admin' });
    expect(privileged.status).toBe(422);
    expect(await User.countDocuments()).toBe(0);
  });

  it('logs in with a generic error for an unknown email or wrong password', async () => {
    const app = makeApp();
    await register(request(app));

    const unknown = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: 'nobody@example.com', password: 'CampusLoop9' });
    const wrong = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email, password: 'WrongPass9' });

    for (const response of [unknown, wrong]) {
      expect(response.status).toBe(401);
      expect(response.body.error).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
      expect(response.headers['set-cookie']).toBeUndefined();
    }
  });

  it('updates lastLoginAt and sets a fresh session on valid login', async () => {
    const app = makeApp();
    await register(request(app));

    const response = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email.toUpperCase(), password: 'CampusLoop9' });

    expect(response.status).toBe(200);
    expect(cookiePair(response)).not.toBeNull();
    expect(response.body.data.user.lastLoginAt).toEqual(expect.any(String));

    const stored = await User.findOne({ email: validRegistration.email });
    expect(stored.lastLoginAt).toBeInstanceOf(Date);
  });

  it('blocks inactive accounts only after verifying their password', async () => {
    const app = makeApp();
    await register(request(app));
    await User.updateOne({ email: validRegistration.email }, { isActive: false });

    const wrong = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email, password: 'WrongPass9' });
    expect(wrong.status).toBe(401);

    const response = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email, password: 'CampusLoop9' });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ACCOUNT_DISABLED');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rate limits login attempts with retry guidance', async () => {
    const app = makeApp({ authRateLimits: { login: { limit: 2 } } });
    await register(request(app));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/login')
        .set(writeHeaders)
        .send({ email: validRegistration.email, password: 'WrongPass9' });
      expect(response.status).toBe(401);
    }

    const limited = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email, password: 'WrongPass9' });

    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe('RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('session hydration and authorization', () => {
  it('returns only the current user from the cookie session', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    const registered = await register(agent);
    const other = await User.create({
      name: 'Other Student',
      email: 'other@example.com',
      passwordHash: '$2b$12$not-used-in-this-test',
    });

    const response = await agent.get('/api/auth/me');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.body.data.user.id).toBe(registered.body.data.user.id);
    expect(response.body.data.user.id).not.toBe(String(other._id));
    expect(response.body.data.user.email).toBe(validRegistration.email);
    expect(response.body.data.user.passwordHash).toBeUndefined();
    expect(response.body.data.user.tokenVersion).toBeUndefined();
  });

  it('supports bearer tokens for API clients and rejects missing or tampered cookies', async () => {
    const app = makeApp();
    const registered = await register(request(app));
    const token = cookiePair(registered).slice('flexi_token='.length);

    const bearer = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(bearer.status).toBe(200);

    const missing = await request(app).get('/api/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body.error.code).toBe('UNAUTHENTICATED');

    const tampered = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'flexi_token=not-a-valid-token');
    expect(tampered.status).toBe(401);
    expect(tampered.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('applies server-side role and ownership guards', () => {
    const forbiddenNext = vi.fn();
    requireAdmin({ user: { id: 'one', role: 'student' } }, {}, forbiddenNext);
    expect(forbiddenNext.mock.calls[0][0].statusCode).toBe(403);

    const adminNext = vi.fn();
    requireAdmin({ user: { id: 'one', role: 'admin' } }, {}, adminNext);
    expect(adminNext).toHaveBeenCalledWith();

    const anonymousNext = vi.fn();
    requireRole('student')({}, {}, anonymousNext);
    expect(anonymousNext.mock.calls[0][0].statusCode).toBe(401);

    const ownNext = vi.fn();
    requireSelf('id')({ user: { id: 'one' }, params: { id: 'one' } }, {}, ownNext);
    expect(ownNext).toHaveBeenCalledWith();

    const otherNext = vi.fn();
    requireSelf('id')({ user: { id: 'one' }, params: { id: 'two' } }, {}, otherNext);
    expect(otherNext.mock.calls[0][0].statusCode).toBe(403);
  });
});

describe('logout and password changes', () => {
  it('logs out, clears the cookie, and rejects the old token', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    const registered = await register(agent);
    const oldCookie = cookiePair(registered);

    const response = await agent.post('/api/auth/logout').set(writeHeaders);

    expect(response.status).toBe(204);
    const cleared = response.headers['set-cookie'].find((value) =>
      value.startsWith('flexi_token='),
    );
    expect(cleared).toMatch(/^flexi_token=;/);
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);

    const oldSession = await request(app)
      .get('/api/auth/me')
      .set('Cookie', oldCookie);
    expect(oldSession.status).toBe(401);

    const stored = await User.findOne({ email: validRegistration.email });
    expect(stored.tokenVersion).toBe(1);
  });

  it('still clears cookies when logout receives an invalid session', async () => {
    const app = makeApp();
    const response = await request(app)
      .post('/api/auth/logout')
      .set(writeHeaders)
      .set('Cookie', 'flexi_token=expired-or-invalid');

    expect(response.status).toBe(204);
    expect(response.headers['set-cookie'][0]).toMatch(/^flexi_token=;/);
  });

  it('changes the password, revokes old tokens, and issues a new cookie', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    const registered = await register(agent);
    const oldCookie = cookiePair(registered);

    const changed = await agent
      .patch('/api/auth/password')
      .set(writeHeaders)
      .send({ currentPassword: 'CampusLoop9', newPassword: 'LanternBuild7' });

    expect(changed.status).toBe(200);
    expect(cookiePair(changed)).not.toBeNull();
    expect(changed.body.data.user.passwordHash).toBeUndefined();
    expect(changed.body.data.user.tokenVersion).toBeUndefined();

    const oldSession = await request(app)
      .get('/api/auth/me')
      .set('Cookie', oldCookie);
    expect(oldSession.status).toBe(401);

    const currentSession = await agent.get('/api/auth/me');
    expect(currentSession.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email, password: 'CampusLoop9' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .set(writeHeaders)
      .send({ email: validRegistration.email, password: 'LanternBuild7' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects an incorrect or reused current password', async () => {
    const app = makeApp();
    const agent = request.agent(app);
    await register(agent);

    const wrong = await agent
      .patch('/api/auth/password')
      .set(writeHeaders)
      .send({ currentPassword: 'WrongPass9', newPassword: 'LanternBuild7' });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

    const reused = await agent
      .patch('/api/auth/password')
      .set(writeHeaders)
      .send({ currentPassword: 'CampusLoop9', newPassword: 'CampusLoop9' });
    expect(reused.status).toBe(422);
    expect(reused.body.error.fields).toHaveProperty('newPassword');
  });
});

describe('CSRF and security headers', () => {
  it('rejects cookie-style writes without origin and custom-header proof', async () => {
    const app = makeApp();

    const missingOrigin = await request(app)
      .post('/api/auth/register')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send(validRegistration);
    expect(missingOrigin.status).toBe(403);

    const missingHeader = await request(app)
      .post('/api/auth/register')
      .set('Origin', CLIENT_ORIGIN)
      .send(validRegistration);
    expect(missingHeader.status).toBe(403);

    const response = await register(request(app));
    expect(response.status).toBe(201);
  });
});
