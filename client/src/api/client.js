const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function fallbackErrorMessage(status) {
  if (status === 403) {
    return 'The request was blocked before it reached the FLEXI server. Check that the backend is running on the configured port.';
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'The FLEXI server is unavailable. Check that the backend is running and try again.';
  }

  return 'The request could not be completed.';
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_FAILED', fields = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

async function readPayload(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestPayload(path, { method = 'GET', body, signal } = {}) {
  const headers = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (WRITE_METHODS.has(method)) {
    headers['X-Requested-With'] = 'XMLHttpRequest';
  }

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }

    throw new ApiError('Unable to reach the FLEXI server. Check your connection and try again.', {
      code: 'NETWORK_ERROR',
    });
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message || fallbackErrorMessage(response.status), {
      status: response.status,
      code: payload?.error?.code || 'REQUEST_FAILED',
      fields: payload?.error?.fields || null,
    });
  }

  return payload;
}

export async function apiRequest(path, options) {
  const payload = await requestPayload(path, options);
  return payload?.data ?? null;
}

export async function apiRequestPage(path, options) {
  const payload = await requestPayload(path, options);

  return {
    data: payload?.data ?? [],
    meta: payload?.meta ?? null,
  };
}
