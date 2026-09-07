# Shipping Touchline Fantasy to a phone and to Google Play

Everything in the repo is configured for this already: Android package id,
version code, icons, splash, permissions, and EAS build profiles. What's left
needs your accounts, so it can't be done from a sandbox.

---

## 0. The one blocker: the backend must be public first

A phone cannot reach `localhost` — on a device that address means the phone
itself. Until the API is deployed somewhere with a real hostname, an installed
build has nothing to talk to and every screen will fail to load. (The app now
says exactly this instead of showing a bare network error.)

Deploy first — `render.yaml` in this repo is a one-click blueprint; see
[README.md](./README.md#deploying) — then note the URL, e.g.
`https://touchline-api.onrender.com`. Everything below assumes you have it.

Set it in `mobile/eas.json`, replacing `REPLACE-WITH-YOUR-API-HOST` in both the
`preview` and `production` profiles:

```json
"env": { "EXPO_PUBLIC_API_BASE_URL": "https://touchline-api.onrender.com/api" }
```

Also set `CORS_ORIGINS` on the API to the origins you serve the app from.

---

## 1. Trying it on your phone

### Fastest — Expo Go, no build (a few minutes)

On your own machine, with the phone on the **same Wi-Fi**:

```bash
cd mobile
npm install
# your machine's LAN address, so the phone can reach the API on your laptop
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4000/api npx expo start
```

Install **Expo Go** from the Play Store, scan the QR code in the terminal.
Replace `192.168.1.42` with your machine's actual LAN IP (`ipconfig` on
Windows, `ifconfig`/`ip addr` on macOS/Linux) — and make sure the API is
running there with `npm run server:dev`.

### A real installable APK — EAS Build (~15 min, free tier)

This builds on Expo's servers, so it needs a free Expo account but no Android
SDK on your machine:

```bash
cd mobile
npx eas login                                   # free account at expo.dev
npx eas build --platform android --profile preview
```

EAS generates and keeps the signing keystore for you. When it finishes you get
a download link — open it on the phone and install the APK (Android will ask
you to allow installs from that source). This build is a standalone app: no
Expo Go, no dev server.

---

## 2. Publishing to Google Play

### What you need to have

- **Google Play Developer account** — one-time $25, at
  [play.google.com/console](https://play.google.com/console).
- **A deployed backend** (section 0). An app that can't reach its API will be
  rejected in review as a broken experience.
- **Privacy policy at a public URL** — [`store/PRIVACY.md`](./store/PRIVACY.md)
  is written and ready; fill in your contact email, then host it (GitHub Pages
  on this repo is enough) and keep the URL.

### Build the release bundle

Play requires an **AAB**, not an APK. The `production` profile already produces
one and auto-increments `versionCode`:

```bash
cd mobile
npx eas build --platform android --profile production
```

### Create the listing

Everything for it is in [`store/`](./store):

| Play Console field | File |
| --- | --- |
| App name, short & full description (TR + EN) | `store/listing.md` |
| App icon 512×512 | `store/play-store-icon-512.png` |
| Feature graphic 1024×500 | `store/play-feature-graphic.png` |
| Phone screenshots (6, 1080×2160) | `store/screenshots/` |
| Privacy policy URL | host `store/PRIVACY.md` |

Then complete, in the Console:

- **Data safety** — declare: name/user id and in-app messages collected,
  transmitted over HTTPS, not shared with third parties, deletion on request.
  This must match `store/PRIVACY.md`.
- **Content rating** questionnaire — declare that the app has user-to-user
  communication (league chat).
- **Target audience** — 13+, so the chat declaration is consistent.
- **App access** — reviewers must be able to log in. Give them a team name and
  coach name to type; the app creates the account on the spot, so no test
  credentials are needed. Say that in the notes.

### Upload and submit

```bash
npx eas submit --platform android --latest
```

or upload the `.aab` by hand in the Console.

### The delay nobody expects

If your developer account is a **personal** account created after November
2023, Google requires **closed testing with at least 12 testers who stay opted
in for 14 continuous days** before you may apply for production access. Start
that clock early: create a closed testing track, add 12 people, and let it run
while you finish the listing. Organisation accounts are exempt.

Review itself typically takes a few days on top.

---

## 3. Before you ship — a short list

- [ ] API deployed, reachable over HTTPS, `CORS_ORIGINS` set
- [ ] `EXPO_PUBLIC_API_BASE_URL` set in both EAS profiles
- [ ] Installed the `preview` APK on a real phone and played a full flow:
      sign up → onboarding → squad → a bid → chat
- [ ] Contact email filled into `store/PRIVACY.md`, hosted, URL noted
- [ ] `versionCode` / `version` bumped for each new upload
- [ ] Seed data reviewed — decide whether real users should land in the demo
      league (`TRAP-2027`) or create their own on first run
