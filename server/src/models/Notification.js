import mongoose, { Schema } from 'mongoose';
import {
  NOTIFICATION_ENTITY_TYPES,
  NOTIFICATION_TYPES,
} from '../constants/domain.js';
import { baseSchemaOptions } from './schemaUtils.js';

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    entityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPES,
      default: null,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    dedupeKey: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'notifications',
  },
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ entityType: 1, entityId: 1 });
notificationSchema.index(
  { dedupeKey: 1 },
  {
    unique: true,
    partialFilterExpression: { dedupeKey: { $type: 'string' } },
  },
);

export const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
