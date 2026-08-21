import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const bookmarks = new Hono<AppEnv>()

bookmarks.use('*', requireAuth)

bookmarks.get('/', async (c) => {
  const user = c.get('user')
  const { results } = await c.env.DB.prepare(
    `SELECT id, url, title, description, image_url, notes, created_at
     FROM bookmarks
     WHERE user_id = ?
     ORDER BY created_at DESC`
  )
    .bind(user.id)
    .all()
  return c.json(results)
})

bookmarks.post('/', async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{
    url?: string
    title?: string
    description?: string
    image_url?: string
    notes?: string
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

  return c.json({ id: result.meta.last_row_id }, 201)
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
