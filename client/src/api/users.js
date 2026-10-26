import { apiRequest } from './client.js';

function normalizeUser(user) {
  return user ? { ...user, id: user.id || user._id } : null;
}

export async function getPublicProfile(userId, { signal } = {}) {
  const data = await apiRequest(`/users/${userId}`, { signal });
  return { user: normalizeUser(data.user), projects: data.projects || [] };
}

export async function getMyProfile() {
  const data = await apiRequest('/users/me');
  return { user: normalizeUser(data.user), counts: data.counts };
}

export async function updateMyProfile(changes) {
  const data = await apiRequest('/users/me', {
    method: 'PATCH',
    body: changes,
  });
  return normalizeUser(data.user);
}
