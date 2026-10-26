import assert from 'node:assert/strict';
import test from 'node:test';
import { isMyProjectsRoute } from '../src/utils/navigation.js';

test('My projects is active for management routes', () => {
  assert.equal(isMyProjectsRoute('/dashboard/projects'), true);
  assert.equal(isMyProjectsRoute('/dashboard/projects/'), true);
  assert.equal(isMyProjectsRoute('/projects/new'), true);
  assert.equal(isMyProjectsRoute('/projects/new/'), true);
  assert.equal(isMyProjectsRoute('/projects/abc123/edit'), true);
});

test('My projects is inactive for discovery and unrelated routes', () => {
  assert.equal(isMyProjectsRoute('/projects'), false);
  assert.equal(isMyProjectsRoute('/projects/abc123'), false);
  assert.equal(isMyProjectsRoute('/dashboard'), false);
  assert.equal(isMyProjectsRoute('/dashboard/profile'), false);
});
