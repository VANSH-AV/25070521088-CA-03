import mongoose, { Schema } from 'mongoose';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants/domain.js';
import { baseSchemaOptions } from './schemaUtils.js';

const taskSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    milestone: {
      type: Schema.Types.ObjectId,
      ref: 'Milestone',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 140,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'todo',
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: 'medium',
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'tasks',
  },
);

taskSchema.pre('validate', function validateCompletionState() {
  if (this.status === 'done') {
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
    return;
  }

  if (this.isNew || this.isModified('status')) {
    this.completedAt = null;
  }
});

taskSchema.index({ project: 1, status: 1, order: 1 });
taskSchema.index({ project: 1, assignedTo: 1, status: 1 });
taskSchema.index({ project: 1, dueDate: 1 });
taskSchema.index({ milestone: 1, order: 1 });

export const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);
