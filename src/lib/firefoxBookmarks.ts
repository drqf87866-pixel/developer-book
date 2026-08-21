export interface ImportedBookmark {
  url: string
  title: string | null
  image_url: string | null
}

interface FirefoxNode {
  type?: string
  uri?: string
  title?: string
  iconUri?: string
  children?: FirefoxNode[]
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function imageFromIconUri(iconUri: string | undefined): string | null {
  if (!iconUri || iconUri.startsWith('fake-favicon-uri:')) return null
  return isHttpUrl(iconUri) ? iconUri : null
}

function walk(node: FirefoxNode, seen: Set<string>, out: ImportedBookmark[]) {
  if (node.type === 'text/x-moz-place' && node.uri && isHttpUrl(node.uri)) {
    if (!seen.has(node.uri)) {
      seen.add(node.uri)
      out.push({
        url: node.uri,
        title: node.title?.trim() ? node.title.trim() : null,
        image_url: imageFromIconUri(node.iconUri),
      })
    }
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walk(child, seen, out)
    }
  }
}

export function parseFirefoxBookmarks(data: unknown): ImportedBookmark[] {
  if (!data || typeof data !== 'object') {
    throw new Error('Ungültige Firefox-Lesezeichen-Datei')
  }

  const root = data as FirefoxNode
  const hasPlaces =
    root.type === 'text/x-moz-place-container' ||
    Array.isArray(root.children) ||
    root.type === 'text/x-moz-place'

  if (!hasPlaces) {
    throw new Error('Keine Firefox-Lesezeichen in der Datei gefunden')
  }

  const bookmarks: ImportedBookmark[] = []
  walk(root, new Set<string>(), bookmarks)

  if (bookmarks.length === 0) {
    throw new Error('Keine importierbaren Lesezeichen gefunden')
  }

  return bookmarks
}
