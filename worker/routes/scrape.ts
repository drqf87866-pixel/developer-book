import { Hono } from 'hono'
import { requireAuth } from '../middleware/auth'
import type { AppEnv } from '../types'

const scrape = new Hono<AppEnv>()

scrape.use('*', requireAuth)

// POST /api/scrape/og  { url: string }
// Holt og:title / og:description / og:image per HTMLRewriter.
// Bewusst KEIN DOM-Parser (z.B. cheerio) - der wäre auf dem
// Workers-Free-Plan (10ms CPU-Zeit/Request) zu teuer.
scrape.post('/og', async (c) => {
  const body = await c.req.json<{ url?: string }>()
  if (!body.url) {
    return c.json({ error: 'url ist erforderlich' }, 400)
  }

  let response: Response
  try {
    response = await fetch(body.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BookmarkManagerBot/1.0)',
      },
    })
  } catch {
    return c.json({ error: 'URL konnte nicht geladen werden' }, 502)
  }

  const meta: Record<string, string> = {}

  const rewriter = new HTMLRewriter().on('meta', {
    element(el) {
      const key = el.getAttribute('property') || el.getAttribute('name')
      const content = el.getAttribute('content')
      if (key && content) meta[key] = content
    },
  })

  await rewriter.transform(response).text()

  return c.json({
    title: meta['og:title'] || meta['title'] || null,
    description: meta['og:description'] || meta['description'] || null,
    image: meta['og:image'] || null,
    siteName: meta['og:site_name'] || null,
  })
})

export default scrape
