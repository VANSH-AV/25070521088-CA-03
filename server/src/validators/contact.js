import { z } from 'zod';
import { emailSchema, trimmedText } from './shared.js';

export const contactSchema = z
  .object({
    name: trimmedText(2, 80, 'Name'),
    email: emailSchema,
    subject: trimmedText(3, 120, 'Subject'),
    message: trimmedText(10, 2000, 'Message'),
    website: z.string().max(200).optional().default(''),
  })
  .strict();
