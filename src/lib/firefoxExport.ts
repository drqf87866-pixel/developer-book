import type { Bookmark } from '../types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function toUnixSeconds(iso: string): number {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return Math.floor(Date.now() / 1000)
  return Math.floor(ms / 1000)
}

/**
 * Baut eine Netscape-Bookmark-HTML-Datei,
 * die Firefox über „Lesezeichen aus HTML importieren“ einlesen kann.
 */
export function buildFirefoxBookmarksHtml(bookmarks: Bookmark[]): string {
  const now = Math.floor(Date.now() / 1000)
  const items = bookmarks
    .map((b) => {
      const href = escapeHtml(b.url)
      const title = escapeHtml(b.title?.trim() || b.url)
      const addDate = toUnixSeconds(b.created_at)
      const tags =
        b.tags && b.tags.length > 0
          ? ` TAGS="${escapeHtml(b.tags.join(','))}"`
          : ''
      const annotation = (b.notes?.trim() || b.description?.trim() || '').trim()
      const dd = annotation ? `\n            <DD>${escapeHtml(annotation)}` : ''

      return `        <DT><A HREF="${href}" ADD_DATE="${addDate}"${tags}>${title}</A>${dd}`
    })
    .join('\n')

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and imported by a BOOKMARKS database.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${now}" LAST_MODIFIED="${now}">Bookmark Manager</H3>
    <DL><p>
${items}
    </DL><p>
</DL><p>
`
}

export function downloadFirefoxBookmarksHtml(bookmarks: Bookmark[], filename?: string) {
  const html = buildFirefoxBookmarksHtml(bookmarks)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = filename ?? `bookmarks-${stamp}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
