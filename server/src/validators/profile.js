import { z } from 'zod';
import { AVAILABILITY_STATUSES } from '../constants/domain.js';
import {
  httpUrlSchema,
  tagArraySchema,
  trimmedText,
} from './shared.js';

const linksSchema = z
  .object({
    github: httpUrlSchema.optional(),
    linkedin: httpUrlSchema.optional(),
    portfolio: httpUrlSchema.optional(),
  })
  .strict();

const profileFields = {
  name: trimmedText(2, 60, 'Name'),
  headline: trimmedText(0, 120, 'Headline'),
  bio: trimmedText(0, 1000, 'Bio'),
  college: trimmedText(0, 120, 'College'),
  course: trimmedText(0, 120, 'Course'),
  graduationYear: z
    .union([
      z.null(),
      z
        .number()
        .int('Graduation year must be a whole number.')
        .min(2000, 'Graduation year must be 2000 or later.')
        .max(2100, 'Graduation year must be 2100 or earlier.'),
    ]),
  skills: tagArraySchema(20, 'skills'),
  links: linksSchema,
  availability: z.enum(AVAILABILITY_STATUSES, {
    error: 'Choose a valid availability status.',
  }),
  avatarUrl: httpUrlSchema,
};

export const updateProfileSchema = z
  .object(profileFields)
  .partial()
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Provide at least one profile field to update.',
      });
    }
  });
