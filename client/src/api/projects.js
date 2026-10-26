import { apiRequest, apiRequestPage } from './client.js';

function queryString(params = {}) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function listProjects(params, { signal } = {}) {
  const result = await apiRequestPage(`/projects${queryString(params)}`, { signal });
  return { projects: result.data, meta: result.meta };
}

export async function getProject(projectId, { signal } = {}) {
  return apiRequest(`/projects/${projectId}`, { signal });
}

export async function createProject(project) {
  const data = await apiRequest('/projects', { method: 'POST', body: project });
  return data.project;
}

export async function updateProject(projectId, changes) {
  const data = await apiRequest(`/projects/${projectId}`, {
    method: 'PATCH',
    body: changes,
  });
  return data.project;
}

export async function archiveProject(projectId) {
  return apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
}

export async function listMyProjects(params = {}, { signal } = {}) {
  const result = await apiRequestPage(`/users/me/projects${queryString(params)}`, { signal });
  return { projects: result.data, meta: result.meta };
}
