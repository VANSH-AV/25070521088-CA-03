import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const importScript = `
  import('./src/config/env.js')
    .then(({ env }) => {
      console.log(JSON.stringify({ port: env.PORT, origins: env.CLIENT_ORIGINS }));
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
`;

function loadEnv(overrides = {}) {
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: 'test',
    CLIENT_ORIGIN: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://127.0.0.1:27017',
    MONGODB_DB_NAME: 'flexi_test',
    JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters-long',
    ...overrides,
  };

  for (const key of Object.keys(env)) {
    if (env[key] === undefined) {
      delete env[key];
    }
  }

  return spawnSync(process.execPath, ['--input-type=module', '-e', importScript], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
  });
}

describe('environment validation', () => {
  it('applies safe defaults for a valid environment', () => {
    const result = loadEnv();

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      port: 5050,
      origins: ['http://localhost:5173'],
    });
  });

  it('fails fast when the MongoDB URI is missing', () => {
    const result = loadEnv({ MONGODB_URI: undefined });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid environment configuration');
    expect(result.stderr).toContain('MONGODB_URI');
  });

  it('fails fast when the JWT secret is missing or too short', () => {
    const missing = loadEnv({ JWT_SECRET: undefined });

    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain('JWT_SECRET');

    const short = loadEnv({ JWT_SECRET: 'too-short' });

    expect(short.status).toBe(1);
    expect(short.stderr).toContain('JWT_SECRET must contain at least 32 characters');
  });

  it('rejects invalid token lifetimes and insecure production cookies', () => {
    const invalidExpiry = loadEnv({ JWT_EXPIRES_IN: 'seven-days' });

    expect(invalidExpiry.status).toBe(1);
    expect(invalidExpiry.stderr).toContain('JWT_EXPIRES_IN');

    const insecureProduction = loadEnv({
      NODE_ENV: 'production',
      COOKIE_SECURE: 'false',
    });

    expect(insecureProduction.status).toBe(1);
    expect(insecureProduction.stderr).toContain('COOKIE_SECURE must be true in production');
  });

  it('rejects permissive trust-proxy values', () => {
    const result = loadEnv({ TRUST_PROXY: 'true' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('TRUST_PROXY must be false or a positive proxy hop count');
  });

  it('rejects invalid client origins and insecure same-site cookies', () => {
    const invalidOrigin = loadEnv({ CLIENT_ORIGIN: 'http://localhost:5173/' });
    expect(invalidOrigin.status).toBe(1);
    expect(invalidOrigin.stderr).toContain('CLIENT_ORIGIN contains an invalid origin');

    const insecureCookie = loadEnv({
      COOKIE_SAME_SITE: 'none',
      COOKIE_SECURE: 'false',
    });
    expect(insecureCookie.status).toBe(1);
    expect(insecureCookie.stderr).toContain('COOKIE_SAME_SITE=none requires COOKIE_SECURE=true');
  });
});
