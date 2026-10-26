import mongoose, { Schema } from 'mongoose';
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
} from '../constants/domain.js';
import { baseSchemaOptions } from './schemaUtils.js';

const reportSchema = new Schema(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: REPORT_TARGET_TYPES,
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      enum: REPORT_REASONS,
      required: true,
    },
    details: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'open',
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
      select: false,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'reports',
  },
);

reportSchema.pre('validate', function validateReportState() {
  if (
    this.targetType === 'user' &&
    this.reporter &&
    this.targetId &&
    String(this.targetId) === String(this.reporter)
  ) {
    this.invalidate('targetId', 'You cannot report your own account.');
  }

  if (['resolved', 'dismissed'].includes(this.status)) {
    if (!this.reviewedAt) {
      this.reviewedAt = new Date();
    }
    return;
  }

  if (this.isNew || this.isModified('status')) {
    this.reviewedAt = null;
  }
});

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1 }, { unique: true });
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ reviewedBy: 1, reviewedAt: -1 });

export const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);
