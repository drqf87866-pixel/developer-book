import { useState } from 'react'
import { api } from '../lib/api'
import type { User } from '../types'

const fieldClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent'

export function AuthScreen({ onAuthed }: { onAuthed: (user: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const user =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password)
      onAuthed(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }

  const isLogin = mode === 'login'

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Library</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
          {isLogin ? 'Anmelden' : 'Konto erstellen'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isLogin
            ? 'Melde dich an, um deine Bookmarks zu sehen.'
            : 'Registriere dich, um Bookmarks privat zu speichern.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            placeholder="Passwort"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClass}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Bitte warten…' : isLogin ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isLogin ? 'Noch kein Konto?' : 'Schon registriert?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? 'register' : 'login')
              setError(null)
            }}
            className="font-medium text-accent hover:text-accent-hover"
          >
            {isLogin ? 'Registrieren' : 'Anmelden'}
          </button>
        </p>
      </div>
    </div>
  )
}
