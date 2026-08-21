import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { hashPassword, verifyPassword } from '../lib/password'
import {
  clearSessionCookie,
  createSession,
  hashToken,
  SESSION_COOKIE,
} from '../lib/session'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

const auth = new Hono<AppEnv>()

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function validateCredentials(email: string, password: string): string | null {
  if (!EMAIL_RE.test(email)) return 'Ungültige E-Mail-Adresse'
  if (password.length < MIN_PASSWORD) return `Passwort muss mindestens ${MIN_PASSWORD} Zeichen haben`
  return null
}

auth.post('/register', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { email?: string; password?: string }
  const email = normalizeEmail(body.email ?? '')
  const password = body.password ?? ''
  const invalid = validateCredentials(email, password)
  if (invalid) return c.json({ error: invalid }, 400)

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email)
    .first()
  if (existing) {
    return c.json({ error: 'E-Mail ist bereits registriert' }, 409)
  }

  const passwordHash = await hashPassword(password)
  const result = await c.env.DB.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .bind(email, passwordHash)
    .run()

  const userId = Number(result.meta.last_row_id)
  await createSession(c, userId)
  return c.json({ id: userId, email }, 201)
})

auth.post('/login', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { email?: string; password?: string }
  const email = normalizeEmail(body.email ?? '')
  const password = body.password ?? ''

  const user = await c.env.DB.prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
    .bind(email)
    .first<{ id: number; email: string; password_hash: string }>()

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: 'E-Mail oder Passwort ungültig' }, 401)
  }

  await createSession(c, user.id)
  return c.json({ id: user.id, email: user.email })
})

auth.post('/logout', async (c) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (token) {
    const id = await hashToken(token)
    await c.env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run()
  }
  clearSessionCookie(c)
  return c.body(null, 204)
})

auth.get('/me', requireAuth, (c) => {
  return c.json(c.get('user'))
})

export default auth
