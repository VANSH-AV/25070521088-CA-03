const UNIT_MILLISECONDS = Object.freeze({
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
});

const DURATION_PATTERN = /^([1-9]\d*)(ms|s|m|h|d|w)$/;

export function isDuration(value) {
  return typeof value === 'string' && DURATION_PATTERN.test(value);
}

export function durationToMilliseconds(value) {
  const match = DURATION_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Invalid duration: ${value}`);
  }

  return Number(match[1]) * UNIT_MILLISECONDS[match[2]];
}
