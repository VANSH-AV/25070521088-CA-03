import mongoose, { Schema } from 'mongoose';
import { APPLICATION_STATUSES } from '../constants/domain.js';
import { baseSchemaOptions, stringArrayField } from './schemaUtils.js';

const applicationSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    applicant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 1000,
    },
    relevantSkills: stringArrayField({ max: 10 }),
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'pending',
    },
    decidedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    decidedAt: {
      type: Date,
      default: null,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'applications',
  },
);

applicationSchema.pre('validate', function validateDecisionState() {
  if (this.status === 'pending') {
    if (this.isNew) {
      this.decidedAt = null;
      this.decidedBy = null;
    }
    return;
  }

  if (!this.decidedAt) {
    this.decidedAt = new Date();
  }

  if (['accepted', 'rejected'].includes(this.status) && !this.decidedBy) {
    this.invalidate('decidedBy', 'A decision author is required for accepted or rejected applications.');
  }
});

applicationSchema.index({ project: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ project: 1, status: 1, createdAt: 1 });
applicationSchema.index({ applicant: 1, status: 1, createdAt: -1 });
applicationSchema.index({ decidedBy: 1, decidedAt: -1 });

export const Application =
  mongoose.models.Application || mongoose.model('Application', applicationSchema);
