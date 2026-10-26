import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import test from 'node:test';
import {
  formatDate,
  formatMonthYear,
  formatTimestamp,
  projectAvailabilityLabel,
} from '../src/utils/format.js';

const formatModule = new URL('../src/utils/format.js', import.meta.url).href;

function formatTimestampIn(timeZone, value) {
  const source = `import { formatTimestamp } from ${JSON.stringify(formatModule)}; process.stdout.write(formatTimestamp(${JSON.stringify(value)}));`;
  return execFileSync(process.execPath, ['--input-type=module', '--eval', source], {
    encoding: 'utf8',
    env: { ...process.env, TZ: timeZone },
  });
}

test('date-only deadlines remain on the selected UTC calendar day', () => {
  assert.equal(formatDate('2099-12-31'), 'Dec 31, 2099');
  assert.equal(formatDate('2099-12-31T23:59:59.999Z'), 'Dec 31, 2099');
  assert.equal(formatDate('2100-01-01T00:00:00.000Z'), 'Jan 01, 2100');
});

test('invalid or missing deadlines use the fallback label', () => {
  assert.equal(formatDate(null), 'No deadline');
  assert.equal(formatDate('not-a-date'), 'No deadline');
});

test('timestamps use the viewer local calendar day', () => {
  assert.equal(
    formatTimestampIn('Pacific/Kiritimati', '2026-10-26T23:30:00.000Z'),
    'Oct 27, 2026',
  );
  assert.equal(
    formatTimestampIn('America/Adak', '2026-10-26T05:30:00.000Z'),
    'Oct 25, 2026',
  );
  assert.equal(formatTimestamp(null), 'Not available');
});

test('month and year formatting handles missing values', () => {
  assert.equal(formatMonthYear('2026-10-26T23:30:00.000Z'), 'October 2026');
  assert.equal(formatMonthYear(null), '');
  assert.equal(formatMonthYear('not-a-date'), '');
});

test('availability reflects recruiting status and capacity', () => {
  assert.equal(
    projectAvailabilityLabel({ status: 'in_progress', openSlots: 3 }),
    'Not recruiting',
  );
  assert.equal(
    projectAvailabilityLabel({ status: 'completed', openSlots: 0 }),
    'Not recruiting',
  );
  assert.equal(
    projectAvailabilityLabel({ status: 'recruiting', openSlots: 0 }),
    'Team full',
  );
  assert.equal(
    projectAvailabilityLabel({ status: 'recruiting', openSlots: 1 }),
    '1 spot open',
  );
  assert.equal(
    projectAvailabilityLabel({ status: 'recruiting', openSlots: 4 }),
    '4 spots open',
  );
});
