export class AppError extends Error {
  constructor(statusCode, code, message, { fields, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
