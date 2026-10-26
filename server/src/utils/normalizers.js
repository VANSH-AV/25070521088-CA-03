export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeTags(values = []) {
  return values.map(normalizeText);
}

export function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function exactCaseInsensitive(value) {
  return new RegExp(`^${escapeRegExp(normalizeText(value))}$`, 'i');
}
