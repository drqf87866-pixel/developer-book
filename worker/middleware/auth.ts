import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { hashToken, SESSION_COOKIE } from '../lib/session'
import type { AppEnv, AuthUser } from '../types'

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (!token) {
    return c.json({ error: 'Nicht angemeldet' }, 401)
  }

  const sessionId = await hashToken(token)
  const row = await c.env.DB.prepare(
    `SELECT users.id, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.id = ?
       AND sessions.expires_at > datetime('now')`
  )
    .bind(sessionId)
    .first<AuthUser>()

  if (!row) {
    return c.json({ error: 'Nicht angemeldet' }, 401)
  }

  c.set('user', row)
  await next()
})
