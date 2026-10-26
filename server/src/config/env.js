import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';
import { isDuration } from '../utils/duration.js';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config({
    path: fileURLToPath(new URL('../../.env', import.meta.url)),
    quiet: true,
  });
}

const trustProxyFromEnv = z
  .string()
  .default('false')
  .transform((value, context) => {
    if (value === 'false') {
      return false;
    }

    if (/^[1-9]\d*$/.test(value)) {
      return Number(value);
    }

    context.addIssue({
      code: 'custom',
      message: 'TRUST_PROXY must be false or a positive proxy hop count.',
    });

    return z.NEVER;
  });

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(5050),
    TRUST_PROXY: trustProxyFromEnv,
    CLIENT_ORIGIN: z
      .string()
      .default('http://localhost:5173')
      .transform((value, context) => {
        const origins = value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean);

        if (origins.length === 0) {
          context.addIssue({
            code: 'custom',
            message: 'CLIENT_ORIGIN must contain at least one origin.',
          });
          return z.NEVER;
        }

        for (const origin of origins) {
          try {
            const parsed = new URL(origin);

            if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
              throw new Error('Origin must include only scheme, host, and port.');
            }
          } catch {
            context.addIssue({
              code: 'custom',
              message: `CLIENT_ORIGIN contains an invalid origin: ${origin}`,
            });
            return z.NEVER;
          }
        }

        return origins;
      }),
    MONGODB_URI: z
      .string()
      .min(1)
      .refine(
        (value) => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'),
        'MONGODB_URI must start with mongodb:// or mongodb+srv://.',
      ),
    MONGODB_DB_NAME: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'MONGODB_DB_NAME contains invalid characters.')
      .default('flexi_dev'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must contain at least 32 characters.'),
    JWT_EXPIRES_IN: z
      .string()
      .default('7d')
      .refine(isDuration, 'JWT_EXPIRES_IN must use ms, s, m, h, d, or w units.'),
    JWT_ISSUER: z.string().min(1).default('flexi-api'),
    JWT_AUDIENCE: z.string().min(1).default('flexi-web'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
    COOKIE_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  })
  .superRefine((data, context) => {
    if (data.COOKIE_SAME_SITE === 'none' && !data.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SAME_SITE'],
        message: 'COOKIE_SAME_SITE=none requires COOKIE_SECURE=true.',
      });
    }

    if (data.NODE_ENV === 'production' && !data.COOKIE_SECURE) {
      context.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'COOKIE_SECURE must be true in production.',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');

  throw new Error(
    [
      'Invalid environment configuration:',
      details,
      '',
      'Create server/.env from server/.env.example, then set MONGODB_URI and a JWT_SECRET of at least 32 characters.',
    ].join('\n'),
  );
}

const data = parsed.data;

export const env = Object.freeze({
  NODE_ENV: data.NODE_ENV,
  isProduction: data.NODE_ENV === 'production',
  PORT: data.PORT,
  TRUST_PROXY: data.TRUST_PROXY,
  CLIENT_ORIGINS: data.CLIENT_ORIGIN,
  MONGODB_URI: data.MONGODB_URI,
  MONGODB_DB_NAME: data.MONGODB_DB_NAME,
  JWT_SECRET: data.JWT_SECRET,
  JWT_EXPIRES_IN: data.JWT_EXPIRES_IN,
  JWT_ISSUER: data.JWT_ISSUER,
  JWT_AUDIENCE: data.JWT_AUDIENCE,
  BCRYPT_ROUNDS: data.BCRYPT_ROUNDS,
  COOKIE_SECURE: data.COOKIE_SECURE,
  COOKIE_SAME_SITE: data.COOKIE_SAME_SITE,
});

export { envSchema };
