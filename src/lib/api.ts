import type { Bookmark, OgMetadata, User } from '../types'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `API-Fehler ${res.status}`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  me: () => request<User>('/api/auth/me'),

  register: (email: string, password: string) =>
    request<User>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),

  getBookmarks: () => request<Bookmark[]>('/api/bookmarks'),

  createBookmark: (data: Partial<Bookmark>) =>
    request<{ id: number }>('/api/bookmarks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateBookmark: (id: number, data: Partial<Bookmark>) =>
    request<{ success: boolean }>(`/api/bookmarks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteBookmark: (id: number) =>
    request<void>(`/api/bookmarks/${id}`, { method: 'DELETE' }),

  scrapeUrl: (url: string) =>
    request<OgMetadata>('/api/scrape/og', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
}
