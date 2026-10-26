import { z } from 'zod';
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_BYTES } from '../constants/auth.js';

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email must be 254 characters or fewer.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.')
  .transform((value) => value.toLowerCase());

function passwordSchema(label = 'Password') {
  return z.string().superRefine((value, context) => {
    const bytes = Buffer.byteLength(value, 'utf8');

    if (bytes < PASSWORD_MIN_BYTES) {
      context.addIssue({
        code: 'custom',
        message: `${label} must be at least ${PASSWORD_MIN_BYTES} characters.`,
      });
    }

    if (bytes > PASSWORD_MAX_BYTES) {
      context.addIssue({
        code: 'custom',
        message: `${label} must be ${PASSWORD_MAX_BYTES} bytes or fewer.`,
      });
    }

    if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
      context.addIssue({
        code: 'custom',
        message: `${label} must include at least one letter and one number.`,
      });
    }
  });
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(60, 'Name must be 60 characters or fewer.'),
    email: emailSchema,
    password: passwordSchema(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required.').max(1024),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.').max(1024),
    newPassword: passwordSchema('New password'),
  })
  .strict();
