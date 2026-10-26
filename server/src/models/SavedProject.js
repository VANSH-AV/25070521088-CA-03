import mongoose, { Schema } from 'mongoose';
import { baseSchemaOptions } from './schemaUtils.js';

const savedProjectSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'savedProjects',
  },
);

savedProjectSchema.index({ user: 1, project: 1 }, { unique: true });
savedProjectSchema.index({ user: 1, createdAt: -1 });
savedProjectSchema.index({ project: 1 });

export const SavedProject =
  mongoose.models.SavedProject || mongoose.model('SavedProject', savedProjectSchema);
