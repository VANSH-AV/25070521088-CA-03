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

export async function getWorkspace(projectId, { signal } = {}) {
  return apiRequest(`/projects/${projectId}/workspace`, { signal });
}

export async function listTasks(projectId, params = {}, { signal } = {}) {
  const result = await apiRequestPage(
    `/projects/${projectId}/tasks${queryString(params)}`,
    { signal },
  );
  return { tasks: result.data, meta: result.meta };
}

export async function createTask(projectId, task) {
  const data = await apiRequest(`/projects/${projectId}/tasks`, {
    method: 'POST',
    body: task,
  });
  return data.task;
}

export async function updateTask(taskId, changes) {
  const data = await apiRequest(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: changes,
  });
  return data.task;
}

export async function deleteTask(taskId) {
  return apiRequest(`/tasks/${taskId}`, { method: 'DELETE' });
}

export async function listMilestones(projectId, params = {}, { signal } = {}) {
  const result = await apiRequestPage(
    `/projects/${projectId}/milestones${queryString(params)}`,
    { signal },
  );
  return { milestones: result.data, meta: result.meta };
}

export async function createMilestone(projectId, milestone) {
  const data = await apiRequest(`/projects/${projectId}/milestones`, {
    method: 'POST',
    body: milestone,
  });
  return data.milestone;
}

export async function updateMilestone(milestoneId, changes) {
  const data = await apiRequest(`/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: changes,
  });
  return data.milestone;
}

export async function deleteMilestone(milestoneId) {
  return apiRequest(`/milestones/${milestoneId}`, { method: 'DELETE' });
}
