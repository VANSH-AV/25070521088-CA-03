import mongoose, { Schema } from 'mongoose';
import { CONTACT_MESSAGE_STATUSES } from '../constants/domain.js';
import { baseSchemaOptions } from './schemaUtils.js';

const contactMessageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: CONTACT_MESSAGE_STATUSES,
      default: 'new',
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
      select: false,
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    handledAt: {
      type: Date,
      default: null,
    },
  },
  {
    ...baseSchemaOptions(),
    collection: 'contactMessages',
  },
);

contactMessageSchema.pre('validate', function validateHandlingState() {
  if (this.isNew || this.isModified('status')) {
    this.handledAt = this.status === 'new' ? null : new Date();
  }
});

contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index(
  { name: 'text', subject: 'text', message: 'text' },
  { weights: { subject: 3, message: 1, name: 1 } },
);

export const ContactMessage =
  mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);
