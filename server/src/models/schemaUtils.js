import { Schema } from 'mongoose';
import {
  hasUniqueValues,
  isHttpUrl,
  maxArrayLength,
  uniqueObjectIds,
} from '../utils/validators.js';

export function baseSchemaOptions() {
  return {
    timestamps: true,
    versionKey: false,
    strict: true,
    toJSON: {
      transform(_document, returned) {
        delete returned.passwordHash;
        delete returned.__v;
        return returned;
      },
    },
  };
}

export function httpUrlField({ maxlength = 500 } = {}) {
  return {
    type: String,
    trim: true,
    maxlength,
    default: null,
    validate: {
      validator: isHttpUrl,
      message: 'Use a valid http or https URL without credentials.',
    },
  };
}

export function stringArrayField({ max, eachMax = 30, uniqueCaseInsensitive = false } = {}) {
  const validators = [
    {
      validator: maxArrayLength(max),
      message: `At most ${max} values are allowed.`,
    },
  ];

  if (uniqueCaseInsensitive) {
    validators.push({
      validator: hasUniqueValues,
      message: 'Values must be unique, ignoring case.',
    });
  }

  return {
    type: [
      {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: eachMax,
      },
    ],
    default: [],
    validate: validators,
  };
}

export function objectIdArrayField({ ref, max } = {}) {
  return {
    type: [
      {
        type: Schema.Types.ObjectId,
        ref,
      },
    ],
    default: [],
    validate: [
      {
        validator: maxArrayLength(max),
        message: `At most ${max} references are allowed.`,
      },
      {
        validator: uniqueObjectIds,
        message: 'References must be unique.',
      },
    ],
  };
}
