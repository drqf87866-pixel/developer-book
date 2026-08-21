# Bookmark Manager

Developer Bookmark & Knowledge Manager – React/Vite-Frontend + Hono-API,
alles als ein Cloudflare-Worker-Deployment (Static Assets + API + D1).

## Struktur

```
bookmark-manager/
├── src/                  # React-Frontend (Vite)
│   ├── components/       # noch leer, hier kommen UI-Bausteine rein
│   ├── lib/api.ts        # Fetch-Wrapper fürs Backend
│   └── types/            # geteilte TS-Typen
├── worker/                # Cloudflare Worker (Hono-API)
│   ├── index.ts           # Hono-App, Routen-Registrierung
│   └── routes/
│       ├── bookmarks.ts   # CRUD gegen D1
│       └── scrape.ts      # OpenGraph-Scraper (HTMLRewriter)
├── migrations/            # D1-Schema
└── wrangler.toml          # Cloudflare-Konfiguration
```

## Setup

1. Abhängigkeiten installieren:
   ```
   npm install
   ```

2. Mit Cloudflare einloggen (einmalig):
   ```
   npx wrangler login
   ```

3. D1-Datenbank anlegen:
   ```
   npx wrangler d1 create bookmark-manager-db
   ```
   Die zurückgegebene `database_id` in `wrangler.toml` eintragen
   (ersetzt `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

4. Schema anwenden:
   ```
   npm run db:migrate:local    # für lokale Entwicklung
   npm run db:migrate:remote   # für die echte, gehostete DB
   ```

5. Lokal entwickeln (zwei Terminals):
   ```
   npm run worker:dev   # startet die Hono-API + D1 lokal auf Port 8787
   npm run dev           # startet Vite auf Port 5173, proxied /api zu 8787
   ```

6. Deployen:
   ```
   npm run deploy
   ```
   Baut das Frontend und deployed alles (Assets + Worker) in einem Schritt.

## Nächste sinnvolle Schritte

- Tags-UI (Tabelle `tags` / `bookmark_tags` existiert schon im Schema)
- Code-Snippets-Bereich (Tabelle `snippets` existiert schon)
- Suche/Filter über Bookmarks
- Auth, falls das Tool mal öffentlich erreichbar sein soll
