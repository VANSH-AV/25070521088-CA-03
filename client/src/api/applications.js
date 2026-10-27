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

export async function applyToProject(projectId, application) {
  const data = await apiRequest(`/projects/${projectId}/applications`, {
    method: 'POST',
    body: application,
  });
  return data.application;
}

export async function listProjectApplications(projectId, params = {}, { signal } = {}) {
  const result = await apiRequestPage(
    `/projects/${projectId}/applications${queryString(params)}`,
    { signal },
  );
  return { applications: result.data, meta: result.meta };
}

export async function listMyApplications(params = {}, { signal } = {}) {
  const result = await apiRequestPage(`/applications/me${queryString(params)}`, { signal });
  return { applications: result.data, meta: result.meta };
}

export async function withdrawApplication(applicationId) {
  const data = await apiRequest(`/applications/${applicationId}/withdraw`, {
    method: 'PATCH',
  });
  return data.application;
}

export async function decideApplication(applicationId, decision) {
  const data = await apiRequest(`/applications/${applicationId}/decision`, {
    method: 'PATCH',
    body: { decision },
  });
  return data;
}
