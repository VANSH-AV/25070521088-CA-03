import { apiRequest } from './client.js';

function normalizeUser(user) {
  return user ? { ...user, id: user.id || user._id } : null;
}

export async function registerAccount({ name, email, password }) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });

  return normalizeUser(data.user);
}

export async function loginAccount({ email, password }) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  return normalizeUser(data.user);
}

export async function logoutAccount() {
  await apiRequest('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser({ signal } = {}) {
  const data = await apiRequest('/auth/me', { signal });
  return normalizeUser(data.user);
}

export async function changeAccountPassword({ currentPassword, newPassword }) {
  const data = await apiRequest('/auth/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
  });

  return normalizeUser(data.user);
}
