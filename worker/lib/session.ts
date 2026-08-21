import { deleteCookie, setCookie } from 'hono/cookie'
import type { Context } from 'hono'
import type { AppEnv } from '../types'

export const SESSION_COOKIE = 'bm_session'
const SESSION_DAYS = 30

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return bytesToHex(new Uint8Array(digest))
}

export function createSessionToken(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

export async function createSession(c: Context<AppEnv>, userId: number): Promise<void> {
  const token = createSessionToken()
  const id = await hashToken(token)
  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`
  )
    .bind(id, userId)
    .run()

  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: new URL(c.req.url).protocol === 'https:',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}
