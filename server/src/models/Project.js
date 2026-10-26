import mongoose, { Schema } from 'mongoose';
import { PROJECT_CATEGORIES, PROJECT_STATUSES } from '../constants/domain.js';
import {
  baseSchemaOptions,
  httpUrlField,
  objectIdArrayField,
  stringArrayField,
} from './schemaUtils.js';

const projectSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 240,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: PROJECT_CATEGORIES,
      default: 'other',
    },
    techStack: stringArrayField({ max: 20 }),
    requiredSkills: stringArrayField({ max: 15 }),
    teamSize: {
      type: Number,
      required: true,
      default: 4,
      min: 2,
      max: 12,
      validate: {
        validator: Number.isInteger,
        message: 'Team size must be an integer.',
      },
    },
    members: objectIdArrayField({ ref: 'User', max: 11 }),
    status: {
      type: String,
      enum: PROJECT_STATUSES,
      default: 'draft',
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    deadline: {
      type: Date,
      default: null,
    },
    repoUrl: httpUrlField(),
    demoUrl: httpUrlField(),
    coverImageUrl: httpUrlField(),
    tags: stringArrayField({ max: 10 }),
    views: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'View count must be an integer.',
      },
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'projects',
  },
);

projectSchema.pre('validate', function validateProjectState() {
  if (this.owner && this.members?.some((member) => String(member) === String(this.owner))) {
    this.invalidate('members', 'The owner cannot also appear in the members list.');
  }

  if (this.members && this.teamSize && this.members.length + 1 > this.teamSize) {
    this.invalidate('members', 'Members cannot exceed the project team size.');
  }

  if (
    ['recruiting', 'in_progress', 'completed'].includes(this.status) &&
    !this.deadline
  ) {
    this.invalidate('deadline', 'A deadline is required once the project is published.');
  }

  if (this.status === 'completed') {
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else if (this.isNew || this.isModified('status')) {
    this.completedAt = null;
  }

  if (
    ['recruiting', 'in_progress', 'completed'].includes(this.status) &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
});

projectSchema.index({ status: 1, isHidden: 1, createdAt: -1 });
projectSchema.index({ status: 1, isHidden: 1, deadline: 1 });
projectSchema.index({ status: 1, isHidden: 1, views: -1 });
projectSchema.index({ owner: 1, createdAt: -1 });
projectSchema.index({ members: 1, status: 1 });
projectSchema.index({ requiredSkills: 1 });
projectSchema.index({ techStack: 1 });
projectSchema.index({ category: 1, status: 1 });
projectSchema.index({ status: 1, deadline: 1 });
projectSchema.index({ isHidden: 1 });
projectSchema.index(
  { title: 'text', summary: 'text', description: 'text', tags: 'text', requiredSkills: 'text' },
  {
    weights: {
      title: 5,
      summary: 3,
      description: 1,
      tags: 2,
      requiredSkills: 2,
    },
  },
);

export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
