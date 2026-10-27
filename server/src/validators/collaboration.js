import { z } from 'zod';
import {
  MILESTONE_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../constants/domain.js';
import { dateInputSchema, tagArraySchema, trimmedText } from './shared.js';

const objectIdSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, 'Choose a valid record.')
  .transform((value) => value.toLowerCase());

const nullableObjectIdSchema = z
  .union([z.null(), z.literal(''), objectIdSchema])
  .transform((value) => (value === '' ? null : value));

const orderSchema = z
  .number()
  .int('Order must be a whole number.')
  .min(0, 'Order cannot be negative.')
  .max(10000, 'Order is too large.');

export const createApplicationSchema = z
  .object({
    message: trimmedText(20, 1000, 'Application message'),
    relevantSkills: tagArraySchema(10, 'skills').default([]),
  })
  .strict();

export const applicationDecisionSchema = z
  .object({
    decision: z.enum(['accepted', 'rejected'], {
      error: 'Choose accept or reject.',
    }),
  })
  .strict();

export const createTaskSchema = z
  .object({
    title: trimmedText(2, 140, 'Task title'),
    description: z
      .string()
      .max(4000)
      .transform((value) => value.trim())
      .superRefine((value, context) => {
        if (value.length > 2000) {
          context.addIssue({
            code: 'custom',
            message: 'Description must be 2000 characters or fewer.',
          });
        }
      })
      .default(''),
    milestoneId: nullableObjectIdSchema.optional(),
    assignedTo: nullableObjectIdSchema.optional(),
    priority: z.enum(TASK_PRIORITIES, { error: 'Choose a valid priority.' }).default('medium'),
    dueDate: dateInputSchema({ allowEmpty: true }).optional(),
    order: orderSchema.optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    title: trimmedText(2, 140, 'Task title'),
    description: z
      .string()
      .max(4000)
      .transform((value) => value.trim())
      .superRefine((value, context) => {
        if (value.length > 2000) {
          context.addIssue({
            code: 'custom',
            message: 'Description must be 2000 characters or fewer.',
          });
        }
      }),
    status: z.enum(TASK_STATUSES, { error: 'Choose a valid task status.' }),
    priority: z.enum(TASK_PRIORITIES, { error: 'Choose a valid priority.' }),
    assignedTo: nullableObjectIdSchema,
    dueDate: dateInputSchema({ allowEmpty: true }),
    milestoneId: nullableObjectIdSchema,
    order: orderSchema,
  })
  .partial()
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Provide at least one task field to update.',
      });
    }
  });

export const createMilestoneSchema = z
  .object({
    title: trimmedText(2, 120, 'Milestone title'),
    description: z
      .string()
      .max(2000)
      .transform((value) => value.trim())
      .superRefine((value, context) => {
        if (value.length > 1000) {
          context.addIssue({
            code: 'custom',
            message: 'Description must be 1000 characters or fewer.',
          });
        }
      })
      .default(''),
    dueDate: dateInputSchema({ allowEmpty: true }).optional(),
    status: z
      .enum(['planned', 'active'], { error: 'Choose planned or active.' })
      .default('planned'),
    order: orderSchema.optional(),
  })
  .strict();

export const updateMilestoneSchema = z
  .object({
    title: trimmedText(2, 120, 'Milestone title'),
    description: z
      .string()
      .max(2000)
      .transform((value) => value.trim())
      .superRefine((value, context) => {
        if (value.length > 1000) {
          context.addIssue({
            code: 'custom',
            message: 'Description must be 1000 characters or fewer.',
          });
        }
      }),
    dueDate: dateInputSchema({ allowEmpty: true }),
    status: z.enum(MILESTONE_STATUSES, { error: 'Choose a valid milestone status.' }),
    order: orderSchema,
  })
  .partial()
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Provide at least one milestone field to update.',
      });
    }
  });
