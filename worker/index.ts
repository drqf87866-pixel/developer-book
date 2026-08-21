import { Hono } from 'hono'
import { cors } from 'hono/cors'
import bookmarks from './routes/bookmarks'
import scrape from './routes/scrape'
import auth from './routes/auth'
import type { Env, Variables } from './types'

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use(
  '/api/*',
  cors({
    origin: (origin) => origin || '*',
    credentials: true,
  })
)

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.route('/api/auth', auth)
app.route('/api/bookmarks', bookmarks)
app.route('/api/scrape', scrape)

export default app
export type { Env } from './types'
