import { AppError } from './AppError.js';

function duplicateKeyError(error) {
  const keyPattern = error.keyPattern || {};

  if (keyPattern.email) {
    return new AppError(409, 'EMAIL_IN_USE', 'An account with that email already exists.');
  }

  if (keyPattern.project && keyPattern.applicant) {
    return new AppError(409, 'APPLICATION_ALREADY_EXISTS', 'You have already applied to this project.');
  }

  if (keyPattern.user && keyPattern.project) {
    return new AppError(409, 'CONFLICT', 'This project is already saved.');
  }

  if (keyPattern.reporter) {
    return new AppError(409, 'CONFLICT', 'You have already reported this target.');
  }

  if (keyPattern.dedupeKey) {
    return new AppError(409, 'CONFLICT', 'This notification event already exists.');
  }

  return new AppError(409, 'CONFLICT', 'A record with those values already exists.');
}

function mongooseValidationError(error) {
  const fields = Object.fromEntries(
    Object.entries(error.errors).map(([path, issue]) => [path, issue.message]),
  );

  return new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
    fields,
  });
}

function castError(error) {
  if (error.kind === 'ObjectId') {
    return new AppError(400, 'INVALID_ID', 'The supplied identifier is invalid.');
  }

  return new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
    fields: {
      [error.path]: error.message,
    },
  });
}

function normalizeError(error) {
  if (error instanceof AppError) {
    return error;
  }

  if (error?.type === 'entity.parse.failed') {
    return new AppError(400, 'INVALID_JSON', 'The request body contains invalid JSON.');
  }

  if (error?.type === 'entity.too.large') {
    return new AppError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
  }

  if (error?.name === 'ValidationError') {
    return mongooseValidationError(error);
  }

  if (error?.name === 'CastError') {
    return castError(error);
  }

  if (error?.code === 11000) {
    return duplicateKeyError(error);
  }

  if (
    ['MongooseServerSelectionError', 'MongoServerSelectionError', 'MongoNetworkError'].includes(
      error?.name,
    )
  ) {
    return new AppError(503, 'SERVICE_UNAVAILABLE', 'The database is unavailable.');
  }

  return new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.'));
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const normalized = normalizeError(error);

  if (req.id) {
    res.setHeader('X-Request-Id', req.id);
  }

  if (normalized.code === 'INTERNAL_ERROR') {
    console.error('[api] unhandled error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
    });
  }

  const payload = {
    success: false,
    error: {
      code: normalized.code,
      message: normalized.message,
    },
  };

  if (normalized.fields) {
    payload.error.fields = normalized.fields;
  }

  if (normalized.details) {
    payload.error.details = normalized.details;
  }

  return res.status(normalized.statusCode).json(payload);
}
