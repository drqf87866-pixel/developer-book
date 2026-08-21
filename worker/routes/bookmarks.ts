import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const bookmarks = new Hono<AppEnv>()

bookmarks.use('*', requireAuth)

async function syncTags(db: D1Database, bookmarkId: number, tags: string[]) {
  const normalized = Array.from(
    new Set(tags.map((t) => t.trim().toLowerCase()).filter((t) => t.length > 0))
  )

  const statements: D1PreparedStatement[] = [
    db.prepare('DELETE FROM bookmark_tags WHERE bookmark_id = ?').bind(bookmarkId),
  ]

  for (const tag of normalized) {
    statements.push(
      db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').bind(tag),
      db.prepare(
        `INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id)
         VALUES (?, (SELECT id FROM tags WHERE name = ?))`
      ).bind(bookmarkId, tag)
    )
  }

  await db.batch(statements)
}

bookmarks.get('/', async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT b.id, b.url, b.title, b.description, b.image_url, b.notes, b.created_at,
            GROUP_CONCAT(t.name) as tags_str
     FROM bookmarks b
     LEFT JOIN bookmark_tags bt ON b.id = bt.bookmark_id
     LEFT JOIN tags t ON bt.tag_id = t.id
     WHERE b.user_id = ?
     GROUP BY b.id
     ORDER BY b.created_at DESC`
  )
    .bind(user.id)
    .all<{
      id: number
      url: string
      title: string | null
      description: string | null
      image_url: string | null
      notes: string | null
      created_at: string
      tags_str: string | null
    }>()

  const formatted = results.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    image_url: row.image_url,
    notes: row.notes,
    created_at: row.created_at,
    tags: row.tags_str ? row.tags_str.split(',').filter(Boolean) : [],
  }))

  return c.json(formatted)
})

bookmarks.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    url?: string
    title?: string
    description?: string
    image_url?: string
    notes?: string
    tags?: string[]
  }>()

  if (!body.url) {
    return c.json({ error: 'url ist erforderlich' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO bookmarks (url, title, description, image_url, notes, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.url,
      body.title ?? null,
      body.description ?? null,
      body.image_url ?? null,
      body.notes ?? null,
      user.id
    )
    .run()

  const bookmarkId = result.meta.last_row_id

  if (body.tags && Array.isArray(body.tags) && bookmarkId) {
    await syncTags(c.env.DB, bookmarkId, body.tags)
  }

  return c.json({ id: bookmarkId }, 201)
})

bookmarks.post('/import', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    bookmarks?: {
      url?: string
      title?: string | null
      image_url?: string | null
    }[]
    tags?: string[]
  }>()

  if (!Array.isArray(body.bookmarks) || body.bookmarks.length === 0) {
    return c.json({ error: 'bookmarks ist erforderlich' }, 400)
  }

  const { results: existingRows } = await c.env.DB.prepare(
    'SELECT url FROM bookmarks WHERE user_id = ?'
  )
    .bind(user.id)
    .all<{ url: string }>()

  const existing = new Set(existingRows.map((row) => row.url))
  const seen = new Set<string>()
  const toInsert: { url: string; title: string | null; image_url: string | null }[] = []

  for (const item of body.bookmarks) {
    const url = item.url?.trim()
    if (!url) continue
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue
    } catch {
      continue
    }
    if (existing.has(url) || seen.has(url)) continue
    seen.add(url)
    toInsert.push({
      url,
      title: item.title?.trim() ? item.title.trim() : null,
      image_url: item.image_url?.trim() ? item.image_url.trim() : null,
    })
  }

  const skipped = body.bookmarks.length - toInsert.length
  const insertedIds: number[] = []

  for (const item of toInsert) {
    const result = await c.env.DB.prepare(
      `INSERT INTO bookmarks (url, title, description, image_url, notes, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(item.url, item.title, null, item.image_url, null, user.id)
      .run()

    if (result.meta.last_row_id) {
      insertedIds.push(result.meta.last_row_id)
    }
  }

  const tags = Array.isArray(body.tags) ? body.tags : []
  if (tags.length > 0) {
    for (const id of insertedIds) {
      await syncTags(c.env.DB, id, tags)
    }
  }

  return c.json({
    imported: insertedIds.length,
    skipped,
    total: body.bookmarks.length,
  })
})

bookmarks.patch('/:id', async (c) => {
  const user = c.get('user')
  const id = Number(c.req.param('id'))
  if (isNaN(id)) {
    return c.json({ error: 'Ungültige ID' }, 400)
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM bookmarks WHERE id = ? AND user_id = ?'
  )
    .bind(id, user.id)
    .first()

  if (!existing) {
    return c.json({ error: 'Bookmark nicht gefunden' }, 404)
  }

  const body = await c.req.json<{
    title?: string | null
    description?: string | null
    notes?: string | null
    tags?: string[]
  }>()

  const updates: string[] = []
  const values: unknown[] = []

  if (body.title !== undefined) {
    updates.push('title = ?')
    values.push(body.title)
  }
  if (body.description !== undefined) {
    updates.push('description = ?')
    values.push(body.description)
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?')
    values.push(body.notes)
  }

  if (updates.length > 0) {
    values.push(id, user.id)
    await c.env.DB.prepare(
      `UPDATE bookmarks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    )
      .bind(...values)
      .run()
  }

  if (body.tags !== undefined && Array.isArray(body.tags)) {
    await syncTags(c.env.DB, id, body.tags)
  }

  return c.json({ success: true })
})

bookmarks.delete('/:id', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')
  const result = await c.env.DB.prepare(
    'DELETE FROM bookmarks WHERE id = ? AND user_id = ?'
  )
    .bind(id, user.id)
    .run()

  if (!result.meta.changes) {
    return c.json({ error: 'Bookmark nicht gefunden' }, 404)
  }

  return c.body(null, 204)
})

export default bookmarks
