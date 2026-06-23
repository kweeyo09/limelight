# Limelight — Theatre Log

**Live:** <https://theatreboxd.vercel.app>

A theatre log built around the **top 100 trending London shows** (researched
June 2026): West End musicals & plays, the major producing houses, new 2026
openings, plus notable dance and opera. Search the catalogue, read a brief
overview, see the **real theatre location on Google Maps**, and **log when you
saw a show and at which theatre** — each logged visit becomes a draggable ticket
stub on the curtained stage.

Built with **Next.js** (App Router, server API routes) and the paper-cut
"Limelight" UI from the Claude Design source.

## Features

- **100-show catalogue** — searchable by title, theatre, genre, or synopsis.
- **Show overview panel** — click any search result for a one-line synopsis,
  venue + address, and an embedded **Google Map** of the real theatre.
- **Log a visit** — record the date seen, the theatre, and (optionally) the
  seat. Logged shows appear as draggable ticket stubs; remove with the × on hover.
- **Durable storage** — logs persist to a **Postgres database** when configured,
  otherwise to the browser's `localStorage` (fully working out of the box).

## Stack

- **Next.js 16** (App Router) — SSR page + serverless API routes (the backend).
- **React 19** — interactive client UI (`components/TheatreLog.tsx`): the
  cursor-reactive curtains, draggable stubs, live search, detail/log panel, map.
- **@vercel/postgres** — visit persistence (Vercel Postgres / Neon).

## Architecture

```text
app/
  layout.tsx          fonts (Bodoni Moda + Spline Sans Mono) + metadata
  page.tsx            server component → reads lib/shows → renders <TheatreLog/>
  globals.css         extracted styles
  api/
    shows/route.ts    GET    /api/shows        → full 100-show catalogue
    search/route.ts   GET    /api/search?q=…   → filtered catalogue
    logs/route.ts     GET    /api/logs         → logged visits
                      POST   /api/logs         → log a visit
                      DELETE /api/logs?id=…     → remove a visit
components/
  TheatreLog.tsx      client UI: curtains, stubs, search, detail panel, map, log
lib/
  shows.ts            the 100-show catalogue + search (single source of truth)
  db.ts               Postgres-backed visit store (graceful localStorage fallback)
```

The search overlay calls `GET /api/search` live, and the log panel calls
`/api/logs`, so the frontend is wired to the backend rather than filtering a
hardcoded array in the browser.

## Configuration

Set these as environment variables (locally in `.env.local`, or in the Vercel
project settings). Both are optional — the app degrades gracefully without them.

| Variable | Purpose | Without it |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Embeds the live theatre map (enable the **Maps Embed API** in Google Cloud). | The panel shows a "View on Google Maps" link instead. |
| `POSTGRES_URL` | Persists logged visits to Postgres. Vercel sets this automatically when you attach a **Postgres / Neon** store. | Visits are saved in the browser's `localStorage`. |

The `visits` table is created automatically on first write (`CREATE TABLE IF NOT
EXISTS`), so no manual migration step is needed.

## Develop

```sh
npm install
npm run dev      # http://localhost:3000
```

## Build & run production

```sh
npm run build
npm run start
```

## Deploy (Vercel)

This app uses server API routes, so it runs on a Node host (not static GitHub
Pages). It's deployed on Vercel at <https://theatreboxd.vercel.app>, imported
from `kweeyo09/limelight`; every push to `main` redeploys automatically.

## Source

The visual design originates from a Claude Design project ("theatre web"),
authored in Claude Design's `.dc.html` runtime format. The implemented design is
the "Curtain Up" variant — fully-drawn crimson drapes with a spotlight pool
focusing the lit stage. Both source revisions are preserved for reference:

- [`Theatre Log - Curtain Up.dc.html`](Theatre%20Log%20-%20Curtain%20Up.dc.html) — current implemented design.
- [`Theatre Log.dc.html`](Theatre%20Log.dc.html) — earlier open-curtain revision.

This repo is a framework-ready implementation of it.
