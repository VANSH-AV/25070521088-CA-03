import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app.js';
import { AppError } from '../src/errors/AppError.js';
import { errorHandler } from '../src/errors/errorHandler.js';
import { validateBody, validateObjectIdParam } from '../src/middleware/validate.js';

const validId = '507f1f77bcf86cd799439011';
const writeHeaders = {
  Origin: 'http://localhost:5173',
  'X-Requested-With': 'XMLHttpRequest',
};

function connectedDatabase() {
  return Promise.resolve({ connected: true, state: 'connected' });
}

describe('FLEXI API shell', () => {
  it('reports health when the database is connected', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-database-ready']).toBe('true');
    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.body).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        database: 'connected',
      },
    });
    expect(response.body.data.uptimeSeconds).toEqual(expect.any(Number));
  });

  it('reports 503 when the database is unavailable', async () => {
    const app = createApp({
      databaseHealth: () => Promise.resolve({ connected: false, state: 'disconnected' }),
    });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.headers['x-database-ready']).toBe('false');
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The database is unavailable.',
      },
    });
  });

  it('reports 503 when the database health check throws', async () => {
    const app = createApp({
      databaseHealth: () => Promise.reject(new Error('connection failed')),
    });
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });

  it('returns structured 404 responses for unknown routes', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found.',
      },
    });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('rejects malformed JSON with a consistent error response', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });
    const response = await request(app)
      .post('/api/health')
      .set(writeHeaders)
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });

  it('rejects bodies larger than 100kb', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });
    const response = await request(app)
      .post('/api/health')
      .set(writeHeaders)
      .set('Content-Type', 'application/json')
      .send({ value: 'x'.repeat(110 * 1024) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects state-changing requests without CSRF headers', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });

    const missingOrigin = await request(app)
      .post('/api/health')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ value: true });

    expect(missingOrigin.status).toBe(403);
    expect(missingOrigin.body.error.code).toBe('FORBIDDEN');

    const missingHeader = await request(app)
      .post('/api/health')
      .set('Origin', 'http://localhost:5173')
      .send({ value: true });

    expect(missingHeader.status).toBe(403);
    expect(missingHeader.body.error.code).toBe('FORBIDDEN');

    const wrongOrigin = await request(app)
      .post('/api/health')
      .set({ ...writeHeaders, Origin: 'https://evil.example' })
      .send({ value: true });

    expect(wrongOrigin.status).toBe(403);
    expect(wrongOrigin.body.error.code).toBe('FORBIDDEN');
  });

  it('allows configured origins and rejects unknown origins', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });

    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await request(app)
      .get('/api/health')
      .set('Origin', 'https://example.com');

    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });

  it('sets baseline security headers', async () => {
    const app = createApp({ databaseHealth: connectedDatabase });
    const response = await request(app).get('/api/health');

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
    expect(response.headers['content-security-policy']).toBeDefined();
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('rate limits repeated API requests with retry guidance', async () => {
    const app = createApp({
      databaseHealth: connectedDatabase,
      rateLimitOptions: { windowMs: 60000, limit: 1 },
    });

    const first = await request(app).get('/api/health');
    const second = await request(app).get('/api/health');

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe('RATE_LIMITED');
    expect(Number(second.headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('request validation', () => {
  it('rejects invalid ObjectId params', () => {
    const next = vi.fn();
    validateObjectIdParam('id')({ params: { id: 'not-an-id' } }, {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('INVALID_ID');
  });

  it('accepts a valid ObjectId param', () => {
    const next = vi.fn();
    validateObjectIdParam('id')({ params: { id: validId } }, {}, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('replaces the body with parsed data and returns field errors', () => {
    const schema = z.object({
      name: z.string().min(2),
      age: z.coerce.number().int().positive(),
    });
    const middleware = validateBody(schema);

    const validNext = vi.fn();
    const validRequest = { body: { name: 'Ada', age: '32' } };
    middleware(validRequest, {}, validNext);
    expect(validNext).toHaveBeenCalledWith();
    expect(validRequest.body).toEqual({ name: 'Ada', age: 32 });

    const invalidNext = vi.fn();
    middleware({ body: { name: 'A', age: '-1' } }, {}, invalidNext);
    const error = invalidNext.mock.calls[0][0];
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields).toHaveProperty('name');
    expect(error.fields).toHaveProperty('age');
  });
});

describe('central error mapping', () => {
  it('maps Mongoose-style cast and validation failures', () => {
    const castApp = express();
    castApp.get('/cast', () => {
      const error = new Error('Cast to ObjectId failed');
      error.name = 'CastError';
      error.kind = 'ObjectId';
      throw error;
    });
    castApp.use(errorHandler);

    return request(castApp)
      .get('/cast')
      .expect(400)
      .expect((response) => {
        expect(response.body.error.code).toBe('INVALID_ID');
      });
  });
});
