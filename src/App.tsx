import { useEffect, useState } from 'react'
import { api } from './lib/api'
import type { Bookmark } from './types'

export default function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getBookmarks().then(setBookmarks).catch((e) => setError(e.message))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!url) return
    setLoading(true)
    setError(null)
    try {
      const meta = await api.scrapeUrl(url)
      const { id } = await api.createBookmark({
        url,
        title: meta.title,
        description: meta.description,
        image_url: meta.image,
      })
      setBookmarks((prev) => [
        {
          id,
          url,
          title: meta.title,
          description: meta.description,
          image_url: meta.image,
          notes: null,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      setUrl('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    await api.deleteBookmark(id)
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Bookmark Manager</h1>

      <form onSubmit={handleAdd} className="mb-8 flex gap-2">
        <input
          type="url"
          required
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Lade...' : 'Hinzufügen'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {bookmarks.map((b) => (
          <li key={b.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-slate-900 hover:underline"
                >
                  {b.title || b.url}
                </a>
                {b.description && (
                  <p className="mt-1 text-sm text-slate-500">{b.description}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(b.id)}
                className="text-sm text-slate-400 hover:text-red-600"
              >
                Löschen
              </button>
            </div>
          </li>
        ))}
      </ul>

      {bookmarks.length === 0 && (
        <p className="text-sm text-slate-400">Noch keine Bookmarks gespeichert.</p>
      )}
    </div>
  )
}
