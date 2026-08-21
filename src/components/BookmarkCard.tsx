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
}: {
  bookmark: Bookmark
  onDelete: (id: number) => void
}) {
  const title = bookmark.title || bookmark.url

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
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-muted">
                {hostname(bookmark.url)}
                <span className="mx-1.5 text-border">·</span>
                {formatDate(bookmark.created_at)}
              </p>
            </div>
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
          {bookmark.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{bookmark.description}</p>
          )}
        </div>
      </div>
    </li>
  )
}
