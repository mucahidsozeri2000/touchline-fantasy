# Running Touchline Fantasy

This repo now contains a real full-stack implementation of the `Touchline Fantasy`
design handoff in `project/` (that folder is kept as-is for reference — the
`README.md`/`chats/` at the repo root are the original Claude Design bundle).

- `server/` — Express + Prisma (SQLite) + Socket.io backend
- `mobile/` — Expo (React Native) app, runs on iOS/Android/web

## First-time setup

```bash
npm install                 # installs both workspaces
npm --prefix server run prisma:generate
npm --prefix server exec -- prisma migrate deploy   # or `prisma migrate dev` if the schema changes
npm run server:seed         # wipes and reseeds the league, players, fixtures
```

The seed script fetches real player photos from Wikipedia by title — it needs
open network egress. If it can't reach Wikipedia it logs a per-player warning
and falls back to initials-in-circles automatically; re-run it later from an
unrestricted network to backfill photos (`npm run server:seed`).

## Run it

```bash
npm run server:dev          # backend on http://localhost:4000
npm run mobile:web          # Expo web on http://localhost:8081 (or `npm --prefix mobile run ios/android`)
```

On a physical device/simulator, edit `API_BASE_URL` in `mobile/src/api.ts` to
your machine's LAN IP instead of `localhost`.

## Notes on how the prototype's mocked behavior became real

- **Auth**: the prototype's Login screen only collects a team name + coach
  name (no password). The backend turns that into a real account and returns
  a bearer token, persisted on-device. "Continue with Google" is a stand-in —
  this project has no real Google OAuth credentials — so it provisions a
  real generated guest account instead of doing nothing.
- **One player, one manager**: enforced server-side with a DB transaction
  (`server/src/routes.ts` `draftOne`), not just client state.
- **Transfer window / auto-assignment**: real clock-driven state
  (`TransferWindow.opensAt/closesAt`), with the Home screen's demo segmented
  control now acting as a real admin override instead of local-only state.
  Closing the window triggers real auto-squad-assignment for anyone with an
  incomplete squad (`server/src/window.ts`).
- **Live draft feed**: Socket.io broadcasts real `draft:new` events to every
  connected manager in the league.
- **Scoring**: real, computed from seeded match stats against the Rules
  page's scoring table, including the captain ×2 multiplier — not the
  prototype's static mock numbers.
- **Player photos**: wired up via `Player.photoUrl`, resolved from Wikipedia
  at seed time; falls back to the prototype's initials-in-circles design
  when a photo isn't available.
