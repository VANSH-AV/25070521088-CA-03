import mongoose, { Schema } from 'mongoose';
import { MILESTONE_STATUSES } from '../constants/domain.js';
import { baseSchemaOptions } from './schemaUtils.js';

const milestoneSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: MILESTONE_STATUSES,
      default: 'planned',
    },
    order: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'milestones',
  },
);

milestoneSchema.pre('validate', function validateCompletionState() {
  if (this.status === 'completed') {
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
    return;
  }

  if (this.isNew || this.isModified('status')) {
    this.completedAt = null;
  }
});

milestoneSchema.index({ project: 1, order: 1 });
milestoneSchema.index({ project: 1, dueDate: 1 });
milestoneSchema.index({ project: 1, status: 1 });

export const Milestone =
  mongoose.models.Milestone || mongoose.model('Milestone', milestoneSchema);
