import { z } from 'zod';
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from '../constants/domain.js';
import {
  dateInputSchema,
  httpUrlSchema,
  tagArraySchema,
  trimmedText,
} from './shared.js';

const statusSchema = z.enum(['draft', 'recruiting'], {
  error: 'Choose draft or recruiting.',
});

const projectFields = {
  title: trimmedText(3, 120, 'Title'),
  summary: trimmedText(10, 240, 'Summary'),
  description: trimmedText(20, 5000, 'Description'),
  category: z.enum(PROJECT_CATEGORIES, { error: 'Choose a valid category.' }),
  techStack: tagArraySchema(20, 'tech items'),
  requiredSkills: tagArraySchema(15, 'skills'),
  teamSize: z
    .number()
    .int('Team size must be a whole number.')
    .min(2, 'Team size must be at least 2.')
    .max(12, 'Team size must be 12 or fewer.'),
  deadline: dateInputSchema({ allowEmpty: true }),
  repoUrl: httpUrlSchema,
  demoUrl: httpUrlSchema,
  coverImageUrl: httpUrlSchema,
  tags: tagArraySchema(10, 'tags'),
  status: statusSchema,
};

export const createProjectSchema = z
  .object({
    ...projectFields,
    category: projectFields.category.default('other'),
    techStack: projectFields.techStack.default([]),
    requiredSkills: projectFields.requiredSkills.default([]),
    teamSize: projectFields.teamSize.default(4),
    deadline: projectFields.deadline.optional(),
    repoUrl: projectFields.repoUrl.optional(),
    demoUrl: projectFields.demoUrl.optional(),
    coverImageUrl: projectFields.coverImageUrl.optional(),
    tags: projectFields.tags.default([]),
    status: projectFields.status.default('draft'),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    ...projectFields,
    status: z.enum(PROJECT_STATUSES, { error: 'Choose a valid project status.' }),
  })
  .partial()
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Provide at least one project field to update.',
      });
    }
  });
