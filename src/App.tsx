import { useEffect, useMemo, useState } from 'react'
import { AuthScreen } from './components/AuthScreen'
import { BookmarkCard } from './components/BookmarkCard'
import { ApiError, api } from './lib/api'
import type { Bookmark, User } from './types'

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // Form state
  const [url, setUrl] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [notesInput, setNotesInput] = useState('')
  const [showAdvancedAdd, setShowAdvancedAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)

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
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
      const parsedNotes = notesInput.trim() ? notesInput.trim() : undefined

      const meta = await api.scrapeUrl(url)
      const { id } = await api.createBookmark({
        url,
        title: meta.title,
        description: meta.description,
        image_url: meta.image,
        notes: parsedNotes ?? null,
        tags: parsedTags,
      })

      setBookmarks((prev) => [
        {
          id,
          url,
          title: meta.title,
          description: meta.description,
          image_url: meta.image,
          notes: parsedNotes ?? null,
          tags: parsedTags,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])
      setUrl('')
      setTagsInput('')
      setNotesInput('')
      setShowAdvancedAdd(false)
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

  async function handleUpdate(
    id: number,
    data: { notes?: string | null; tags?: string[] }
  ) {
    await api.updateBookmark(id, data)
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...data } : b))
    )
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

  // Calculate tag counts across all bookmarks
  const allTags = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookmarks) {
      if (b.tags) {
        for (const t of b.tags) {
          counts[t] = (counts[t] || 0) + 1
        }
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [bookmarks])

  // Calculate unique domains
  const allDomains = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const b of bookmarks) {
      const d = getHostname(b.url)
      counts[d] = (counts[d] || 0) + 1
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [bookmarks])

  // Filtered bookmarks
  const filteredBookmarks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return bookmarks.filter((b) => {
      if (selectedTag && (!b.tags || !b.tags.includes(selectedTag))) {
        return false
      }
      if (selectedDomain && getHostname(b.url) !== selectedDomain) {
        return false
      }
      if (q) {
        const titleMatch = b.title?.toLowerCase().includes(q)
        const urlMatch = b.url.toLowerCase().includes(q)
        const descMatch = b.description?.toLowerCase().includes(q)
        const notesMatch = b.notes?.toLowerCase().includes(q)
        const tagsMatch = b.tags?.some((t) => t.toLowerCase().includes(q))
        if (!titleMatch && !urlMatch && !descMatch && !notesMatch && !tagsMatch) {
          return false
        }
      }
      return true
    })
  }, [bookmarks, searchQuery, selectedTag, selectedDomain])

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

  const hasActiveFilters = Boolean(searchQuery || selectedTag || selectedDomain)

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
          className="mb-6 rounded-xl border border-border bg-surface p-3 shadow-card"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="url"
              required
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedAdd((prev) => !prev)}
                className="rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-text"
                title="Optionale Notizen und Tags"
              >
                {showAdvancedAdd ? 'Weniger Optionen' : '+ Notiz & Tags'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {loading ? 'Lade…' : 'Hinzufügen'}
              </button>
            </div>
          </div>

          {showAdvancedAdd && (
            <div className="mt-3 grid grid-cols-1 gap-3 border-t border-border pt-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted">Tags (kommagetrennt)</label>
                <input
                  type="text"
                  placeholder="z.B. frontend, react, cloudflare"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Notizen</label>
                <input
                  type="text"
                  placeholder="Eigene Notizen hinzufügen..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}
        </form>

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        {bookmarks.length > 0 && (
          <div className="mb-6 space-y-3">
            {/* Search and Domain filter */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Suche in Titeln, URLs, Beschreibungen, Notizen oder Tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 pl-9 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <svg
                  className="absolute left-3 top-2.5 text-muted"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-xs text-muted hover:text-text"
                  >
                    ×
                  </button>
                )}
              </div>

              {allDomains.length > 1 && (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedDomain || ''}
                    onChange={(e) => setSelectedDomain(e.target.value || null)}
                    className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-text focus:border-accent focus:outline-none"
                  >
                    <option value="">Alle Domains ({allDomains.length})</option>
                    {allDomains.map(([dom, count]) => (
                      <option key={dom} value={dom}>
                        {dom} ({count})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Tag-Chips Filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-semibold text-muted mr-1">Tags:</span>
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                    selectedTag === null
                      ? 'bg-accent text-accent-fg'
                      : 'border border-border bg-surface text-muted hover:border-accent/40 hover:text-text'
                  }`}
                >
                  Alle
                </button>
                {allTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-accent text-accent-fg'
                        : 'border border-border bg-surface text-muted hover:border-accent/40 hover:text-text'
                    }`}
                  >
                    #{tag} <span className="opacity-70 text-[10px]">({count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Active filters status bar */}
            {hasActiveFilters && (
              <div className="flex items-center justify-between rounded-lg bg-surface/50 border border-border/60 px-3 py-1.5 text-xs text-muted">
                <span>
                  Gefiltert: {filteredBookmarks.length} von {bookmarks.length} Bookmarks
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedTag(null)
                    setSelectedDomain(null)
                  }}
                  className="font-medium text-accent hover:underline"
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </div>
        )}

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
        ) : filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
            <p className="text-base font-medium text-text">Keine passenden Bookmarks gefunden</p>
            <p className="mt-1 text-sm text-muted">
              Versuche deine Suche oder Filterkriterien anzupassen.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSelectedTag(null)
                setSelectedDomain(null)
              }}
              className="mt-3 rounded-lg border border-border px-3 py-1.5 text-xs text-accent hover:bg-surface"
            >
              Filter zurücksetzen
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredBookmarks.map((b) => (
              <BookmarkCard
                key={b.id}
                bookmark={b}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                onSelectTag={(tag) => setSelectedTag(tag)}
                onSelectDomain={(dom) => setSelectedDomain(dom)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

