import { AppError } from '../errors/AppError.js';

const objectIdPattern = /^[a-fA-F0-9]{24}$/;

export function isObjectId(value) {
  return typeof value === 'string' && objectIdPattern.test(value);
}

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const fields = {};

      for (const issue of result.error.issues) {
        if (issue.code === 'unrecognized_keys' && issue.keys?.length) {
          for (const key of issue.keys) {
            fields[key] = issue.message;
          }
          continue;
        }

        const path = issue.path.join('.') || '_';
        fields[path] = issue.message;
      }

      return next(
        new AppError(422, 'VALIDATION_ERROR', 'Please correct the highlighted fields.', {
          fields,
        }),
      );
    }

    req.body = result.data;
    return next();
  };
}

export function validateObjectIdParam(paramName = 'id') {
  return (req, res, next) => {
    if (!isObjectId(req.params[paramName])) {
      return next(new AppError(400, 'INVALID_ID', `Invalid ${paramName}.`));
    }

    return next();
  };
}
