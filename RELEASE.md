# Getting Touchline Fantasy onto a phone, and onto Google Play

The repo is already configured for this: Android package id, version code, icons,
splash, permissions, and the EAS build profiles. What's left needs your accounts,
so it can't be done from a sandbox.

---

## 1. Put an APK on your phone

The normal way to get a React Native app onto a phone is to build an APK and
install it. Expo builds it on their servers, so **you don't need Android Studio,
the Android SDK, or a signing keystore** — and if you build from GitHub, you
don't need Node or the terminal either.

There are two APKs you can build, and they differ only in whether they talk to a
server:

| | `demo` profile | `preview` profile |
| --- | --- | --- |
| Needs a backend | **No** | Yes, deployed and public |
| Data | Built-in demo league, in memory | Real, saved in Postgres |
| Survives app restart | No — resets | Yes |
| Good for | Seeing and feeling the whole app now | Real testing before release |

Start with `demo`. It's a genuine standalone app — all 19 screens, bidding,
chat, captaincy, filters — that needs nothing but the phone. Then do `preview`
once the API is deployed.

### The no-terminal route: build from GitHub

The code is already on GitHub, so Expo can build it directly.

1. Create a free account at **[expo.dev](https://expo.dev)**.
2. **Settings → Connections → GitHub → Connect**, then **Install and Authorize**
   the Expo GitHub app for the account that owns this repo.
3. **Projects → Create a project**. Use the slug `touchline-fantasy`. Expo shows
   you a **Project ID** (a uuid) and your **account name** — copy both.
4. Tell the repo about that project — **already done here**: `mobile/app.json`
   carries `owner` and `extra.eas.projectId`. If you ever rebuild against a
   different Expo project, those are the two values to change:

   ```json
   "slug": "touchline-fantasy",
   "owner": "your-expo-account-name",
   ```

   ```json
   "extra": {
     "apiBaseUrl": "http://localhost:4000/api",
     "eas": { "projectId": "the-uuid-from-step-3" }
   },
   ```

   (Plain JSON — no comments, watch the commas.)
5. Back on expo.dev: **your project → Project settings → GitHub → Connect** this
   repository. Set **Base directory** to `mobile` — the app lives in a
   subdirectory, and the build fails without this.
6. **Builds → Build from GitHub** (or **Create a build**): platform **Android**,
   profile **`demo`**. It takes roughly 10–20 minutes.
7. When it's done the build page shows a QR code and a download link. Open it
   **on the phone**, download the `.apk`, tap it. Android will ask you to allow
   installs from your browser — allow it, then Install.

That's it. The app is installed like any other app; there's no dev server, no
Expo Go, no Wi-Fi pairing, nothing running on your computer.

### If you'd rather use a terminal

Same thing, needing [Node.js](https://nodejs.org) installed:

```bash
cd mobile
npm install
npx eas login
npx eas init                 # creates the project and writes the id for you
npx eas build --platform android --profile demo
```

`eas init` does step 3–4 above automatically. EAS generates and stores the
signing keystore on first build.

### Then the real one

Once the API is deployed (section 2), edit `mobile/eas.json` and replace
`REPLACE-WITH-YOUR-API-HOST` in the `preview` and `production` profiles:

```json
"env": { "EXPO_PUBLIC_API_BASE_URL": "https://touchline-api.onrender.com/api" }
```

then build the `preview` profile the same way. Set `CORS_ORIGINS` on the API too.

> A phone cannot reach `localhost` — on a device that address means the phone
> itself, so a build pointed there can only fail. The app now says exactly that
> rather than showing a bare network error.

---

## 2. Deploy the backend

Needed for everything except the `demo` APK.

`render.yaml` is a ready blueprint: on [Render](https://render.com) pick
**New → Blueprint**, point it at this repo, and it provisions Postgres, builds
the API and generates a `JWT_SECRET`. Seed once from the service shell with
`npx tsx prisma/seed.ts`, then set `CORS_ORIGINS`. Railway, Fly.io or any VPS
running `docker compose` works the same way — see
[README.md](./README.md#deploying).

Note the URL, e.g. `https://touchline-api.onrender.com`.

---

## 3. Publishing to Google Play

### What you need

- **Google Play Developer account** — one-time $25, at
  [play.google.com/console](https://play.google.com/console).
- **A deployed backend** (section 2). An app that can't reach its API is
  rejected in review as a broken experience.
- **Privacy policy at a public URL** — [`store/PRIVACY.md`](./store/PRIVACY.md)
  is written and ready; fill in your contact email, host it (GitHub Pages on
  this repo is enough) and keep the URL.

### Build the release bundle

Play requires an **AAB**, not an APK. The `production` profile produces one and
auto-increments `versionCode` — build it exactly like the demo APK above, but
choose the **`production`** profile.

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
- **Content rating** questionnaire — declare user-to-user communication (league
  chat).
- **Target audience** — 13+, consistent with the chat declaration.
- **App access** — reviewers must be able to log in. Give them a team name and
  coach name to type; the app creates the account on the spot, so no test
  credentials are needed. Say that in the notes.

### Upload and submit

Upload the `.aab` in the Console, or `npx eas submit --platform android --latest`.

### The delay nobody expects

If your developer account is a **personal** account created after November 2023,
Google requires **closed testing with at least 12 testers who stay opted in for
14 continuous days** before you may apply for production access. Start that
clock early: create a closed testing track, add 12 people, and let it run while
you finish the listing. Organisation accounts are exempt. Review itself takes a
few days on top.

---

## Appendix — running it from a dev machine

Only useful if you're actively changing code. Start the API first
(`npm run server:dev`, on `http://localhost:4000`).

`localhost` inside an emulator or phone means *that device*. The Android
emulator reaches your machine at `10.0.2.2`; a real phone reaches it at your
machine's LAN IP (`ipconfig` on Windows, `ip addr` / `ipconfig getifaddr en0` on
macOS/Linux). The iOS simulator shares `localhost` with the Mac.

```bash
cd mobile && npm install

# Real phone on the same Wi-Fi, via the Expo Go app:
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:4000/api npx expo start

# Android emulator (needs Android Studio), then press `a`:
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api npx expo start

# In a browser:
npm run web
```

The `development` and `preview` profiles set `EXPO_PUBLIC_ALLOW_CLEARTEXT=1`,
which is what lets an installed build talk to a plain `http://` LAN address —
Android 9+ blocks that by default. `production` deliberately leaves it off, so a
released build must use HTTPS.

---

## Before you ship — a short list

- [ ] Installed the `demo` APK and walked the app on a real phone
- [ ] API deployed, reachable over HTTPS, `CORS_ORIGINS` set
- [ ] `EXPO_PUBLIC_API_BASE_URL` set in the `preview` and `production` profiles
- [ ] Installed the `preview` APK and played a full flow: sign up → onboarding →
      squad → a bid → chat
- [ ] Contact email filled into `store/PRIVACY.md`, hosted, URL noted
- [ ] `versionCode` / `version` bumped for each new upload
- [ ] Seed data reviewed — decide whether real users land in the demo league
      (`TRAP-2027`) or create their own on first run
