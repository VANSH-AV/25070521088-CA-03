export function isHttpUrl(value) {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  try {
    const parsed = new URL(value);
    return (
      ['http:', 'https:'].includes(parsed.protocol) &&
      !parsed.username &&
      !parsed.password
    );
  } catch {
    return false;
  }
}

export function hasUniqueValues(values) {
  if (!Array.isArray(values)) {
    return true;
  }

  const normalized = values.map((value) => String(value).trim().toLowerCase());
  return new Set(normalized).size === normalized.length;
}

export function maxArrayLength(max) {
  return (values) => !Array.isArray(values) || values.length <= max;
}

export function uniqueObjectIds(values) {
  if (!Array.isArray(values)) {
    return true;
  }

  return new Set(values.map((value) => String(value))).size === values.length;
}
