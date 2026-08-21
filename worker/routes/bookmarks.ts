import { Hono } from 'hono'

type Bindings = { DB: D1Database }

const bookmarks = new Hono<{ Bindings: Bindings }>()

// GET /api/bookmarks
bookmarks.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM bookmarks ORDER BY created_at DESC'
  ).all()
  return c.json(results)
})

// POST /api/bookmarks
bookmarks.post('/', async (c) => {
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
    `INSERT INTO bookmarks (url, title, description, image_url, notes)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      body.url,
      body.title ?? null,
      body.description ?? null,
      body.image_url ?? null,
      body.notes ?? null
    )
    .run()

  return c.json({ id: result.meta.last_row_id }, 201)
})

// DELETE /api/bookmarks/:id
bookmarks.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM bookmarks WHERE id = ?').bind(id).run()
  return c.body(null, 204)
})

export default bookmarks
