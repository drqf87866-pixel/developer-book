import { Hono } from 'hono'
import { cors } from 'hono/cors'
import bookmarks from './routes/bookmarks'
import scrape from './routes/scrape'

export type Env = {
  DB: D1Database
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Env }>()

app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ status: 'ok' }))

app.route('/api/bookmarks', bookmarks)
app.route('/api/scrape', scrape)

export default app
