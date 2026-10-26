const FALLBACK_PATH = '/dashboard';

function isInternalPath(value) {
  return (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    ![...value].some((character) => character.charCodeAt(0) < 32)
  );
}

export function safeReturnTo(value, fallback = FALLBACK_PATH) {
  if (typeof value !== 'string' || !isInternalPath(value)) {
    return fallback;
  }

  let decoded = value;

  for (let pass = 0; pass < 2; pass += 1) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      return fallback;
    }

    if (!isInternalPath(decoded)) {
      return fallback;
    }
  }

  return value;
}
