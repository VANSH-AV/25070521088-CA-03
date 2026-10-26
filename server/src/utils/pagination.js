import { AppError } from '../errors/AppError.js';

function parseInteger(value, field, fallback) {
  if (value === undefined) {
    return fallback;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw new AppError(400, 'INVALID_PAGINATION', `${field} must be a positive integer.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new AppError(400, 'INVALID_PAGINATION', `${field} must be a positive integer.`);
  }

  return parsed;
}

export function parsePagination(
  query,
  { defaultLimit = 12, maxLimit = 50 } = {},
) {
  const page = parseInteger(query.page, 'page', 1);
  const limit = parseInteger(query.limit, 'limit', defaultLimit);

  if (limit > maxLimit) {
    throw new AppError(400, 'INVALID_PAGINATION', `limit must be ${maxLimit} or fewer.`);
  }

  return { page, limit, skip: (page - 1) * limit };
}

export function paginationMeta({ page, limit, total }) {
  return {
    page,
    limit,
    total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}
