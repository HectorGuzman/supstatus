import { auth } from './firebase';

const API_BASE_URL = __DEV__
  ? 'http://localhost:8080'
  : 'https://sup-experience-backend-858880938649.us-east1.run.app';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export const api = {
  getStories: (cursor?: string) => request<any>(`/v1/stories${cursor ? `?after=${encodeURIComponent(cursor)}` : ''}`),
  getMyStories: () => request<any>('/v1/stories/me'),
  createStory: (body: object) => request<any>('/v1/stories/me', { method: 'POST', body: JSON.stringify(body) }),
  deleteStory: (id: string) => request<any>(`/v1/stories/${id}`, { method: 'DELETE' }),
  likeStory: (id: string) => request<any>(`/v1/stories/${id}/like`, { method: 'POST' }),
  getComments: (storyId: string) => request<any>(`/v1/stories/${storyId}/comments`),
  addComment: (storyId: string, text: string) => request<any>(`/v1/stories/${storyId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteComment: (storyId: string, commentId: string) => request<any>(`/v1/stories/${storyId}/comments/${commentId}`, { method: 'DELETE' }),
  getMySessions: () => request<any>('/v1/sessions/me'),
  createSession: (body: object) => request<any>('/v1/sessions/me', { method: 'POST', body: JSON.stringify(body) }),
  deleteSession: (id: string) => request<any>(`/v1/sessions/${id}`, { method: 'DELETE' }),
  getProfile: () => request<any>('/v1/profile/me'),
  updateProfile: (body: object) => request<any>('/v1/profile/me', { method: 'POST', body: JSON.stringify(body) }),
  searchUsers: (q: string) => request<any>(`/v1/users?q=${encodeURIComponent(q)}`),
  getFollowing: () => request<any>('/v1/users/following'),
  followUser: (targetUid: string) => request<any>(`/v1/users/${targetUid}/follow`, { method: 'POST' }),
  unfollowUser: (targetUid: string) => request<any>(`/v1/users/${targetUid}/follow`, { method: 'DELETE' }),
  getUserProfile: (uid: string) => request<any>(`/v1/users/${uid}/profile`),
};
