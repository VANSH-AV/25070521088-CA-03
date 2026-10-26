import mongoose, { Schema } from 'mongoose';
import { AVAILABILITY_STATUSES, USER_ROLES } from '../constants/domain.js';
import { baseSchemaOptions, httpUrlField, stringArrayField } from './schemaUtils.js';

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'student',
    },
    avatarUrl: httpUrlField(),
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    college: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    course: {
      type: String,
      trim: true,
      maxlength: 120,
      default: '',
    },
    graduationYear: {
      type: Number,
      min: 2000,
      max: 2100,
      default: null,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: 'Graduation year must be an integer.',
      },
    },
    skills: stringArrayField({
      max: 20,
      eachMax: 30,
      uniqueCaseInsensitive: true,
    }),
    links: {
      github: httpUrlField({ maxlength: 300 }),
      linkedin: httpUrlField({ maxlength: 300 }),
      portfolio: httpUrlField({ maxlength: 300 }),
    },
    availability: {
      type: String,
      enum: AVAILABILITY_STATUSES,
      default: 'open',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Token version must be an integer.',
      },
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    ...baseSchemaOptions({ hiddenFields: ['tokenVersion'] }),
    collection: 'users',
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ skills: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index(
  { name: 'text', headline: 'text', skills: 'text' },
  { weights: { name: 3, headline: 2, skills: 1 } },
);

export const User = mongoose.models.User || mongoose.model('User', userSchema);
