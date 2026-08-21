import { useEffect, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { BookmarkCard } from './components/BookmarkCard'
import { ApiError, api } from './lib/api'
import type { Bookmark, User } from './types'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthReady(true))
  }, [])

  useEffect(() => {
    if (!user) {
      setBookmarks([])
      return
    }
    api
      .getBookmarks()
      .then(setBookmarks)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          setUser(null)
          return
        }
        setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      })
  }, [user])

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
      if (e instanceof ApiError && e.status === 401) {
        setUser(null)
        return
      }
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    await api.deleteBookmark(id)
    setBookmarks((prev) => prev.filter((b) => b.id !== id))
  }

  async function handleLogout() {
    await api.logout().catch(() => undefined)
    setUser(null)
    setBookmarks([])
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Laden…
      </div>
    )
  }

  if (!user) {
    return <AuthScreen onAuthed={setUser} />
  }

  const countLabel =
    bookmarks.length === 1 ? '1 gespeicherter Link' : `${bookmarks.length} gespeicherte Links`

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Library</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-text">Bookmark Manager</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted">{countLabel}</span>
            <span className="text-text">{user.email}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-border px-3 py-1.5 text-muted transition-colors hover:border-accent/40 hover:text-text"
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <form
          onSubmit={handleAdd}
          className="mb-8 flex flex-col gap-3 rounded-xl border border-border bg-surface p-3 shadow-card sm:flex-row sm:items-center"
        >
          <input
            type="url"
            required
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Lade…' : 'Hinzufügen'}
          </button>
        </form>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-bg text-accent">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M6 4h9a3 3 0 0 1 3 3v13l-7.5-3.5L3 20V7a3 3 0 0 1 3-3z" />
              </svg>
            </div>
            <p className="text-base font-medium text-text">Noch keine Bookmarks</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Füge oben eine URL hinzu — Titel, Beschreibung und Vorschaubild werden automatisch geladen.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((b) => (
              <BookmarkCard key={b.id} bookmark={b} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
