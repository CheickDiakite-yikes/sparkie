const API_BASE = '/api';

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const authAPI = {
  register: (data: { name: string; email: string; password: string; password_confirm: string; job_role?: string; referral_source?: string }) =>
    fetchJSON('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchJSON('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => fetchJSON('/auth/logout', { method: 'POST' }),
  me: () => fetchJSON('/auth/me'),
};

export const ideasAPI = {
  list: () => fetchJSON('/ideas'),
  get: (id: number) => fetchJSON(`/ideas/${id}`),
  create: (data: { title: string; initial_prompt?: string; color?: string; tags?: string[] }) =>
    fetchJSON('/ideas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) =>
    fetchJSON(`/ideas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    fetchJSON(`/ideas/${id}`, { method: 'DELETE' }),
  addNote: (id: number, text: string) =>
    fetchJSON(`/ideas/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
  updateAnalysis: (id: number, data: any) =>
    fetchJSON(`/ideas/${id}/analysis`, { method: 'PUT', body: JSON.stringify(data) }),
  getChat: (id: number) => fetchJSON(`/ideas/${id}/chat`),
  sendChat: (id: number, text: string) =>
    fetchJSON(`/ideas/${id}/chat`, { method: 'POST', body: JSON.stringify({ text }) }),
};

export const aiAPI = {
  analyze: (id: number) =>
    fetchJSON(`/ideas/${id}/analyze`, { method: 'POST' }),
  chat: (id: number, message: string, history: any[]) =>
    fetchJSON(`/ideas/${id}/ai-chat`, { method: 'POST', body: JSON.stringify({ message, history }) }),
  generateImage: (id: number, data: { visual_mode?: string; aspect_ratio?: string; image_size?: string }) =>
    fetchJSON(`/ideas/${id}/generate-image`, { method: 'POST', body: JSON.stringify(data) }),
  deleteImage: (id: number, imageId: number) =>
    fetchJSON(`/ideas/${id}/images/${imageId}`, { method: 'DELETE' }),
  findPlaces: (id: number, location?: { lat: number; lng: number }) =>
    fetchJSON(`/ideas/${id}/find-places`, { method: 'POST', body: JSON.stringify({ location }) }),
};
