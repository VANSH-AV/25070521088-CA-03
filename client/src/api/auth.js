import { apiRequest } from './client.js';

export async function registerAccount({ name, email, password }) {
  const data = await apiRequest('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });

  return data.user;
}

export async function loginAccount({ email, password }) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
  });

  return data.user;
}

export async function logoutAccount() {
  await apiRequest('/auth/logout', { method: 'POST' });
}

export async function getCurrentUser({ signal } = {}) {
  const data = await apiRequest('/auth/me', { signal });
  return data.user;
}

export async function changeAccountPassword({ currentPassword, newPassword }) {
  const data = await apiRequest('/auth/password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
  });

  return data.user;
}
