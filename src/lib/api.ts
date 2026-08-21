import type { Bookmark, OgMetadata } from '../types'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API-Fehler ${res.status}: ${await res.text()}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  getBookmarks: () => request<Bookmark[]>('/api/bookmarks'),

  createBookmark: (data: Partial<Bookmark>) =>
    request<{ id: number }>('/api/bookmarks', {
      method: 'POST',
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
