# Touchline Fantasy

A Champions League fantasy football app for the 2026/27 season, built from the
Claude Design handoff in [`HANDOFF.md`](./HANDOFF.md) and the full screen-by-screen
spec in [`project/CLAUDE_CODE_PROMPT.md`](./project/CLAUDE_CODE_PROMPT.md).

What makes it different from FPL-style fantasy: **every player can be owned by only
one manager per league.** Squads are built through a live auction (sealed or open
bidding, with anti-snipe extensions), and the league runs against real Champions
League fixtures, eliminations and a transfer-window clock.

## Stack

| Part | Tech |
| --- | --- |
| `server/` | Node + TypeScript, Express, Prisma, PostgreSQL |
| `mobile/` | React Native (Expo), TypeScript, React Navigation, React Query, i18next (EN/TR) |

## Run it locally

**1. Backend + database** (needs Docker):

```bash
export JWT_SECRET="$(openssl rand -base64 32)"
docker compose up --build            # Postgres + API on :4000
docker compose exec api npx tsx prisma/seed.ts   # seed the demo league, once
curl localhost:4000/health           # {"ok":true}
```

Or without Docker, against your own Postgres:

```bash
cd server
cp .env.example .env                 # then edit DATABASE_URL + JWT_SECRET
npm install
npx prisma migrate deploy
npm run seed
npm run dev
```

**2. The app:**

```bash
cd mobile
npm install
npm run web        # or: npm run ios / npm run android
```

The app talks to `http://localhost:4000/api` by default. Point a real build at a
deployed API with `EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com/api`.

## Demo data

`npm run server:seed` creates the league **THE OFFSIDE TRAP** (invite code
`TRAP-2027`) with 8 managers, real clubs and players, a 15-man squad, live auction
lots, a waiver pool from Bayern's elimination, fixtures, chat and standings.

To sign in as the seeded manager, use team **FC Northbank** / coach **Sen**
(the seed's email is `you@touchline.dev`). A brand-new name creates a fresh
manager instead, who can then create or join a league from the Home screen.

## Screens

Login · Onboarding · Home · League Setup · Squad (pitch + swap sheet) · Transfers ·
Leagues · Live Auction · Draft Feed · Re-auction & Prices · Exposure & Risk ·
Predictions · Head to Head · League Chat · Rules & Scoring · Match Results ·
Matchday Live · Manager Profile · League Pass

## Backend systems

- **Ownership** — `PlayerOwnership` is the single source of truth per league; a player
  owned by another manager is never selectable anywhere.
- **Auction** — blind (sealed) or live rounds, bid floors in 0.5M steps, anti-snipe
  extension on late bids, lot resolution to the highest bid at window close.
- **Waivers** — released players are claimed in strict reverse-standings priority.
- **Re-auction & pricing** — elimination sweeps clear a club's players from every
  squad and refund their owners; weekly re-rating moves prices from real match stats.
- **Auto-squad** — a deterministic job fills a legal squad from remaining budget for
  any manager who misses the deadline (`POST /api/leagues/:id/close-window`).
- **Scoring** — goals by position (GK 8 / DEF 7 / MID 6 / FWD 5), assists, clean
  sheets, cards, captain ×2; feeds live matchday points, standings and head-to-head.

## Monetization guardrail

The League Pass sells *capacity and presentation* — league size, custom scoring,
blind rounds, re-auctions, cosmetics — and never competitive advantage. Extra
transfers, waiver-priority jumps, last-second bid rights and hidden information
(rival budgets, price forecasts) are explicitly not for sale, and the paywall
screen says so.

## Deploying

The API is a standard container (`server/Dockerfile`) plus a Postgres database.
Set `DATABASE_URL`, `JWT_SECRET` and `CORS_ORIGINS` (comma-separated allowed
origins) in the host's environment; the container runs `prisma migrate deploy`
on start.

`render.yaml` is a ready blueprint: on [Render](https://render.com), pick
**New → Blueprint** and point it at this repo — it provisions Postgres, builds
the API and generates a `JWT_SECRET`. Seed once from the service shell with
`npx tsx prisma/seed.ts`, then set `CORS_ORIGINS`. Any other container host
(Railway, Fly.io, a VPS running `docker compose`) works the same way.

The app builds for web, iOS and Android from `mobile/`. Point it at the deployed
API at build time:

```bash
cd mobile
EXPO_PUBLIC_API_BASE_URL=https://your-api.onrender.com/api npx expo export --platform web
```
