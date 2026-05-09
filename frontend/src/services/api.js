import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const BASE_URL = '/api';

function getToken() {
  return useAuthStore.getState().token;
}

async function request(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${BASE_URL}${url}`, { ...options, headers });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      toast.error('Session expired. Please login again.');
      return { data: null, error: 'Unauthorized' };
    }

    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      const detail = errorData.detail;
      // Check if this is an email_not_verified error (structured detail)
      if (detail && typeof detail === 'object' && detail.error === 'email_not_verified') {
        return { data: null, error: detail };
      }
      toast.error(typeof detail === 'string' ? detail : 'Access denied');
      return { data: null, error: typeof detail === 'string' ? detail : 'Forbidden' };
    }

    // 409 Conflict — return error locally (no toast) so forms can show field-specific messages
    if (response.status === 409) {
      const errorData = await response.json().catch(() => ({}));
      const detail = typeof errorData.detail === 'string' ? errorData.detail : 'Already exists';
      return { data: null, error: detail };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.detail
        ? typeof errorData.detail === 'string'
          ? errorData.detail
          : JSON.stringify(errorData.detail)
        : `Request failed (${response.status})`;
      return { data: null, error: message };
    }

    if (options.responseType === 'blob') {
      const blob = await response.blob();
      return { data: blob, error: null };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Network error' };
  }
}

// ─── Auth ─────────────────────────────────────────────────────

export async function registerUser(data) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginUser(data) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function logoutUser() {
  return request('/auth/logout', { method: 'POST' });
}

export async function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(data) {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe() {
  return request('/auth/me');
}

export async function refreshTokenApi(refreshToken) {
  return request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export async function verifyEmail(token) {
  return request(`/auth/verify-email?token=${encodeURIComponent(token)}`);
}

export async function resendVerification(email) {
  return request('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

// ─── Profile ──────────────────────────────────────────────────

export async function getProfile() {
  return request('/profile');
}

export async function updateProfile(data) {
  return request('/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(data) {
  return request('/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAccount(password) {
  return request('/profile', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  });
}

export async function uploadAvatar(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null, error: err.detail || 'Upload failed' };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Upload failed' };
  }
}

// ─── Generation ───────────────────────────────────────────────

export async function generateCTGAN(file, numRows, epochs) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('num_rows', String(numRows));
  formData.append('epochs', String(epochs));

  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${BASE_URL}/generate/ctgan`, {
      method: 'POST',
      body: formData,
      headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return { data: null, error: err.detail || `Upload failed (${response.status})` };
    }
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err.message || 'Network error' };
  }
}

export async function generateMimesis(schema, numRows, locale = 'en') {
  return request('/generate/mimesis', {
    method: 'POST',
    body: JSON.stringify({ schema, num_rows: numRows, locale }),
  });
}

export async function previewMimesis(schema, locale = 'en') {
  return request('/generate/mimesis/preview', {
    method: 'POST',
    body: JSON.stringify({ schema, num_rows: 3, locale }),
  });
}

export async function downloadResult(token) {
  try {
    const authToken = getToken();
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const response = await fetch(`${BASE_URL}/generate/download/${token}`, { headers });
    if (!response.ok) return { data: null, error: 'Download failed' };

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `synthetic_data_${token.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    return { data: true, error: null };
  } catch (err) {
    return { data: null, error: err.message };
  }
}

export async function getSupportedFields() {
  return request('/generate/supported-fields');
}

// ─── History ──────────────────────────────────────────────────

export async function getHistory(page = 1, limit = 20, mode, status) {
  let url = `/history?page=${page}&limit=${limit}`;
  if (mode) url += `&mode=${mode}`;
  if (status) url += `&status=${status}`;
  return request(url);
}

export async function getJobDetails(jobId) {
  return request(`/history/${jobId}`);
}

export async function deleteJob(jobId) {
  return request(`/history/${jobId}`, { method: 'DELETE' });
}

// ─── Admin ────────────────────────────────────────────────────

export async function getAdminUsers(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.limit) qs.set('limit', params.limit);
  if (params.role) qs.set('role', params.role);
  if (params.search) qs.set('search', params.search);
  if (params.is_active !== undefined) qs.set('is_active', params.is_active);
  if (params.is_blocked !== undefined) qs.set('is_blocked', params.is_blocked);
  return request(`/admin/users?${qs.toString()}`);
}

export async function getAdminUserById(id) {
  return request(`/admin/users/${id}`);
}

export async function blockUser(id) {
  return request(`/admin/users/${id}/block`, { method: 'PATCH' });
}

export async function changeUserRole(id, role) {
  return request(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function deleteUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}

export async function getAdminStats() {
  return request('/admin/stats');
}

export async function getAdminLogs(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', params.page);
  if (params.action) qs.set('action', params.action);
  if (params.user_id) qs.set('user_id', params.user_id);
  return request(`/admin/logs?${qs.toString()}`);
}

export async function getAdminErrors(page = 1) {
  return request(`/admin/errors?page=${page}`);
}

export async function runCleanup() {
  return request('/admin/storage/cleanup', { method: 'DELETE' });
}
