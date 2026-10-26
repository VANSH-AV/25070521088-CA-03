import { z } from 'zod';
import { isHttpUrl } from '../utils/validators.js';
import { normalizeTags, normalizeText } from '../utils/normalizers.js';

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254, 'Email must be 254 characters or fewer.')
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.')
  .transform((value) => value.toLowerCase());

export function tagArraySchema(max, label) {
  return z
    .array(z.string().max(300))
    .max(max, `Use ${max} ${label} or fewer.`)
    .transform((values) => normalizeTags(values))
    .superRefine((values, context) => {
      const seen = new Set();

      values.forEach((value, index) => {
        if (value.length < 1) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `${label} cannot be blank.`,
          });
          return;
        }

        if (value.length > 30) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `Each ${label.replace(/s$/, '')} must be 30 characters or fewer.`,
          });
        }

        const key = value.toLowerCase();

        if (seen.has(key)) {
          context.addIssue({
            code: 'custom',
            path: [index],
            message: `Each ${label.replace(/s$/, '')} must be unique.`,
          });
        }

        seen.add(key);
      });
    });
}

export const httpUrlSchema = z
  .union([z.null(), z.literal(''), z.string().trim().max(500)])
  .transform((value, context) => {
    if (value === null || value === '') {
      return null;
    }

    if (!isHttpUrl(value)) {
      context.addIssue({
        code: 'custom',
        message: 'Use a valid http or https URL without credentials.',
      });
      return z.NEVER;
    }

    return value;
  });

export function dateInputSchema({ allowEmpty = false } = {}) {
  return z
    .union([z.null(), ...(allowEmpty ? [z.literal('')] : []), z.string().trim()])
    .transform((value, context) => {
      if (value === null || value === '') {
        return null;
      }

      const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const parsed = new Date(dateOnly ? `${value}T23:59:59.999Z` : value);

      if (Number.isNaN(parsed.getTime())) {
        context.addIssue({
          code: 'custom',
          message: 'Enter a valid date.',
        });
        return z.NEVER;
      }

      return parsed;
    });
}

export const trimmedText = (min, max, label) =>
  z
    .string()
    .max(max * 2)
    .transform(normalizeText)
    .superRefine((value, context) => {
      if (value.length < min) {
        context.addIssue({
          code: 'custom',
          message: `${label} must be at least ${min} characters.`,
        });
      }

      if (value.length > max) {
        context.addIssue({
          code: 'custom',
          message: `${label} must be ${max} characters or fewer.`,
        });
      }
    });
