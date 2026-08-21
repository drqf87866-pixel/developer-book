import { useState } from 'react'
import type { Bookmark } from '../types'

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function Thumbnail({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className="flex h-24 w-36 shrink-0 items-center justify-center rounded-lg bg-bg text-muted"
        aria-hidden
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M21 16l-5.5-5.5L7 19" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="h-24 w-36 shrink-0 rounded-lg object-cover"
    />
  )
}

export function BookmarkCard({
  bookmark,
  onDelete,
  onUpdate,
  onSelectTag,
  onSelectDomain,
}: {
  bookmark: Bookmark
  onDelete: (id: number) => void
  onUpdate?: (id: number, data: { notes?: string | null; tags?: string[] }) => Promise<void>
  onSelectTag?: (tag: string) => void
  onSelectDomain?: (domain: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [notesInput, setNotesInput] = useState(bookmark.notes || '')
  const [tagsInput, setTagsInput] = useState((bookmark.tags || []).join(', '))
  const [saving, setSaving] = useState(false)

  const title = bookmark.title || bookmark.url
  const domain = hostname(bookmark.url)

  async function handleSave() {
    if (!onUpdate) return
    setSaving(true)
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      await onUpdate(bookmark.id, {
        notes: notesInput.trim() ? notesInput.trim() : null,
        tags: parsedTags,
      })
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setNotesInput(bookmark.notes || '')
    setTagsInput((bookmark.tags || []).join(', '))
    setIsEditing(false)
  }

  return (
    <li className="group rounded-xl border border-border bg-surface p-3 shadow-card transition-colors hover:border-accent/40 hover:bg-surface-hover">
      <div className="flex gap-4">
        <a href={bookmark.url} target="_blank" rel="noreferrer" className="shrink-0">
          <Thumbnail src={bookmark.image_url} alt="" />
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-base font-semibold text-text hover:text-accent"
              >
                {title}
              </a>
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted flex items-center flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onSelectDomain?.(domain)}
                  className="hover:text-accent hover:underline"
                >
                  {domain}
                </button>
                <span className="text-border">·</span>
                <span>{formatDate(bookmark.created_at)}</span>
              </p>
            </div>
            <div className="flex items-center gap-1">
              {onUpdate && !isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setNotesInput(bookmark.notes || '')
                    setTagsInput((bookmark.tags || []).join(', '))
                    setIsEditing(true)
                  }}
                  className="rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-text"
                  aria-label="Bearbeiten"
                  title="Bearbeiten"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(bookmark.id)}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-danger"
                aria-label="Löschen"
                title="Löschen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
                  <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>

          {bookmark.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{bookmark.description}</p>
          )}

          {isEditing ? (
            <div className="mt-3 space-y-2 rounded-lg border border-border bg-bg/50 p-3">
              <div>
                <label className="block text-xs font-medium text-muted">Notizen</label>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Eigene Notizen hinzufügen..."
                  className="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted">Tags (kommagetrennt)</label>
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="z.B. frontend, react, css"
                  className="mt-1 w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="rounded px-2.5 py-1 text-xs text-muted hover:text-text disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded bg-accent px-3 py-1 text-xs font-semibold text-accent-fg hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? 'Speichert…' : 'Speichern'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {bookmark.notes && (
                <div className="mt-2.5 rounded-lg border border-border/60 bg-bg/40 px-3 py-2 text-xs text-text">
                  <span className="font-semibold text-accent/90">Notiz: </span>
                  <span className="whitespace-pre-wrap">{bookmark.notes}</span>
                </div>
              )}

              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {bookmark.tags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => onSelectTag?.(tag)}
                      className="rounded-md border border-border bg-bg px-2 py-0.5 text-xs font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  )
}

