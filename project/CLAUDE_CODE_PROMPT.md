# Touchline Fantasy — Build Prompt for Claude Code

## Context

This is a full-detail implementation prompt for a **Champions League fantasy football app** (season 2026–2027), currently prototyped as a single interactive HTML mockup (`Touchline Fantasy.dc.html`) using the **Modernist** design system (flat, architectural, red-on-white, Archivo typeface, 2px rules, zero border radius). The prototype is a design reference, not production code — recreate the experience natively (React Native / SwiftUI / Flutter / responsive web — pick what fits the target stack) using this document as the full spec.

Core premise: unlike classic FPL-style fantasy football, **every player can be owned by only one manager per league** (auction/draft economy), and the league runs on real Champions League fixtures, eliminations and a live transfer-window clock.

---

## 1. Design system (Modernist) — tokens to recreate

- **Palette**: light ground `#f3f2f2` (bg), ink text `#201e1d`, single accent red `#ec3013` (with a generated 100–900 OKLCH tonal ramp for tints/hovers/pressed states — accent-100 for light fills, accent-700 for text-on-tint, accent-600/400 for hover/press). No second hue — this is a mono red/white/black system.
- **Typography**: Archivo for both headings and body (`--font-heading`, `--font-body`). Headings are bold/800 weight, uppercase micro-labels use `letter-spacing: 0.04–0.1em`.
- **Radius**: 0 everywhere. No rounded corners except perfectly circular avatars.
- **Structure**: strong 2px dividers between sections, flush-left alignment everywhere (including button labels), visible modular grid, no drop shadows except the system's tuned `--shadow-sm/md/lg`.
- **Icons**: Lucide icon set, stroke-based, 1.5–2.5px stroke width depending on size.
- **Components used**: `.btn` (`.btn-primary` solid accent fill, `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block`), `.tag`/`.tag-accent`/`.tag-outline`, `.field`+`.input`, `.seg`+`.seg-opt` (segmented control), `.table` (themed header + row rules), `.hr` (2px rule).
- **Club colors**: each club has one accent hex used only as a small identity dot (never a full-card tint), e.g. Real Madrid `#FEBE10`, Liverpool `#C8102E`, Man City `#6CABDD`, Bayern `#DC052D`, Barcelona `#A50044`, PSG `#004170`, Arsenal `#EF0107`, Leverkusen `#E32219`, Galatasaray `#FDB913`, Milan `#FB090B`. Shown as a small colored ring/dot on the top-right corner of every player avatar (squad pitch, bench, transfer list, auction lots).

---

## 2. App shell & navigation

Mobile-first, single-column, portrait phone frame (design canvas is 400×844 in the prototype — treat as a standard mobile viewport).

**Screen stack / states** (a `screen` state machine at the root, separate from the in-app `tab` state):
1. `login` — team + coach name entry, or Google sign-in
2. `onboarding` — 3-step swipeable/paged explainer
3. `app` — the main tabbed application (default landing after onboarding, **not** the league-setup or auction screen)
4. `leagueSetup` — reachable later from Home's "Set up a new league" row, not part of the forced first-run flow

**Bottom tab bar** (visible inside `app` screen only), 4 tabs: **Home, Squad, Transfers, Leagues**. Icons: house, shield/users, swap-arrows, trophy. Active tab: accent-700 color; inactive: neutral-600.

**Secondary screens** (reached via Home's categorized list, not in the tab bar): Live Auction, Draft Feed, Re-auction & Prices, Exposure & Risk, Predictions, Head to Head, League Chat, Rules & Scoring, Match Results, Matchday Live, League Pass (paywall). All of these have a back-chevron/close in their nav bar returning to Home.

---

## 3. Screen-by-screen spec

### 3.1 Login
- Brand wordmark "TOUCHLINE" top-left; **language switcher** (EN/TR segmented toggle, two adjacent buttons sharing a border) top-right.
- Tagline under the wordmark.
- Two text fields: **Team Name** (placeholder "e.g. FC Northbank" / "örn. FC Northbank"), **Head Coach Name** (placeholder "e.g. Alex Morgan").
- Primary button "Enter League" (disabled until both fields non-empty).
- Divider with "or" label.
- Secondary button "Continue with Google" (official 4-color Google "G" mark + label) — for the prototype this simply seeds default team/coach names and proceeds; in production wire real OAuth.
- Submitting either path → `onboarding`.

### 3.2 Onboarding
- 3 steps, each: a large numbered square icon (1/2/3), a bold title, a body paragraph, progress dots (active dot wider/pill-shaped, accent; inactive dots small neutral squares).
- Step content:
  1. **One player, one manager** — every CL player can be drafted by only one manager in the league; move fast when the window opens.
  2. **The window has a clock** — transfers open at a set time and lock at a deadline; miss it and an automatic squad is assigned.
  3. **Real matches, real points** — squad scores from real CL fixtures; pick a captain each week to double their return.
- CTA button: "Next" on steps 1–2, "Start Managing" on step 3. A ghost "Skip" button always available.
- Finishing or skipping → **`app` screen, Home tab** (this was fixed from an earlier version that wrongly routed to the auction — do not route onboarding to the auction).

### 3.3 Home (tab)
- Nav bar: wordmark + current gameweek tag (e.g. "GW 3").
- Tappable **profile row**: coach initial avatar (accent square, white initial), coach name, "Head Coach · {team name}" — tapping opens **Manager Profile**.
- A demo-only phase switcher (segmented: Locked / Open / Closed) driving the hero card below — in production this reflects the real transfer-window state, not a manual toggle.
- **Hero card**, 3 states:
  - *Locked* (waiting): neutral surface, "Draft window / Transfers open soon", body explains the open time, CTA "View Rules" (outline button, dark on light).
  - *Open*: accent-red fill, "Draft window · live / Transfers are open", body shows free transfers left + countdown to close, CTA "Make Transfers" (white pill, red text).
  - *Closed*: neutral surface, "Draft window · closed / Squads are locked", explains that late managers got an auto-squad and real matches are underway, CTA "View Results" (solid accent).
- **3-stat row**: Rank / Total Points / Squad Value, each in its own bordered cell.
- **League row**: current league name, chevron → Leagues tab.
- **"Set up a new league" row**: dashed-border, plus icon → `leagueSetup` screen.
- **Categorized "more" list**, 4 sections with headers (this replaced a single flat "More" list):
  1. **Matchday** — Matchday Live (accent-tinted row with a live pulse dot), Match Results
  2. **Auction** — Live Auction, Draft Feed, Re-auction & Prices
  3. **Compete** — Head to Head, Predictions, League Chat, Exposure & Risk
  4. **Info** — Rules & Scoring, League Pass (shows a "Locked"/"League Pass" chip reflecting purchase state)

### 3.4 League Setup
- Reached from Home. Back-chevron in nav → Home.
- Segmented control: **Create** / **Join**.
- **Create tab**:
  - League Name text field.
  - **Managers** stepper: a numeric input (free text entry, not fixed radio pills) with **−/+** buttons, clamped 4–20. Below it, a dynamic hint: shows "N managers · even, head-to-head weeks pair cleanly" or "N managers · odd, one manager sits out each head-to-head week" depending on parity, or a prompt to enter 4–20 if invalid/empty.
  - Budget-per-manager selector.
  - **Auction Window**: Opens / Closes text inputs (free text time labels in the prototype; use real date-time pickers in production), plus explanatory copy that unsold players go to open sale at list price once the window closes.
  - Primary "Create League" button (disabled until name is non-empty and manager count is valid); on success shows an **invite code** panel (monospace-tracked code + "Share" tag) and a settings summary table (managers, budget, auction open/close).
- **Join tab**: invite-code text field, OR a list of **open leagues** (name, seats filled/total, auction open time) each joinable with one tap.

### 3.5 Squad (tab)
- Nav: wordmark + gameweek tag.
- Accent strip: "Deadline" label + countdown/date.
- 2-cell stat row: Budget Left / Free Transfers.
- **Pitch diagram**: a bordered rectangle drawn as an actual football pitch (halfway line, center circle, two penalty boxes as open-bottomed/open-topped rectangles at top and bottom). Player markers are absolutely positioned by formation coordinates (percentage left/top) for GK (1), DEF (4), MID (3), FWD (3) — a 4-3-3. Each marker: a circular avatar (initials fallback), a club-color dot top-right corner, a name chip below it, and a ring color that changes to accent when that player is the captain.
- Tapping any starter marker opens a **bottom sheet** (slide-up panel over a dimmed backdrop):
  - Player identity row (avatar, name, club · position · price) + close (X) button.
  - Full-width button: "Make Captain" / "Remove Captain" (toggles captaincy; only one captain at a time).
  - "Swap with" section listing bench players who share the same position, each a tappable row (avatar, name, club, price, swap icon). Tapping a bench player **swaps them into the starting XI** and the tapped starter moves to the bench, immediately reflected on the pitch and bench strip. If no bench player shares the position, show an empty-state (shirt/jersey icon + explanatory line).
- **Bench strip**: 4 circular avatars in a row below the pitch, each with club dot + name.
- Primary "Save Squad" button at the bottom (shows "Saved" confirmation transiently after tap).

### 3.6 Transfers (tab)
- Nav: wordmark + a tag showing free-transfer count or window state.
- **Three phases** (driven by the same window-state concept as the Home hero):
  - *Locked*: centered clock icon + "Transfer window locked" + copy pointing to the open time. No list shown.
  - *Open*: full transfer UI (below).
  - *Closed*: a banner "Window closed — squads locked" + note that non-confirming managers got an auto-squad; list still visible but read-only.
- Transfer UI (open/closed):
  - 2-cell stat row: Budget Left / Shortlisted (count + total value).
  - Position filter segmented control: All / GK / DEF / MID / FWD.
  - Scrollable player list: avatar w/ club dot, name, club · position · price · form. Players already **drafted by someone else** show "Drafted by {manager}" instead of price/form, are dimmed, and their action slot shows a locked/briefcase icon instead of the add button. Available players show a toggle button (plus ↔ checkmark) to add/remove from a shortlist.
  - Bottom-pinned "Confirm Transfers" button, disabled until shortlist is non-empty and phase is Open.

### 3.7 Leagues (tab)
- Nav: wordmark + league name tag.
- Rank card: large "3rd"-style rank number + a small up/down trend indicator ("+1 this GW").
- Standings table: Pos / Manager / GW / Total, with the current user's row tinted accent-100 and bold.

### 3.8 Live Auction
- Nav: back-chevron, "AUCTION" title, a "Live" accent tag.
- Accent strip showing countdown label — text changes to "Blind round closes in" when the blind-round toggle (below) is on, otherwise "Closes in", plus an "extension" banner ("Going, going… a late bid extended this lot by 60 seconds") that appears only in live (non-blind) mode.
- **Outbid alert strip** (live mode only): one row per lot where you've just been outbid — "{manager} outbid you on {player} — £Xm" + a "Counter" button that bumps your pending bid to one increment above the new leader and dismisses the alert.
- A toggle row: **"Blind round"** checkbox + hint text ("Rival bids stay hidden until the round closes" / "Live bidding — every bid is public"). In blind mode, lot cards hide the rival's true bid (show "——" and a bid count instead) and show "Sealed"/"Bid In" status chips instead of "Leading/Outbid/Open".
- 3-stat row: Free Funds / Committed / Leading (count of lots you're currently winning).
- **Search bar** (magnifier icon, text input, clear button) + position filter segmented control (All/GK/DEF/MID/FWD). Empty state (search icon + "No lots match "{query}"") when filtered results are empty.
- **Lot cards**, one per player up for auction: avatar (club dot), name, position · club · list price, a status chip (Leading = solid accent fill / white text; Outbid/Open/Sealed = outline), and a bid-adjuster row: −/+ buttons stepping by 0.5M around a floor of `max(list price, current top bid + 0.5)`, a live-updating "my bid" readout, and a "Bid"/"Bid In" submit button that only commits the bid (and updates leader/budget) on tap — dragging the stepper does **not** commit until submit.
- **Waiver Pool** section: players released by injury/elimination or dropped by a manager, shown with reason text, claimable in strict **reverse-standings priority** (explain "you claim {Nth} in the order" — bottom-of-table managers get first pick). Claim button flips to a disabled "Claimed" state once used.

### 3.9 Draft Feed
- Nav: back-chevron, "İhale Akışı" / "Draft Feed" title.
- Explanatory line: "Every player can be drafted by one manager only."
- Reverse-chronological feed: avatar, "{manager} drafted {player}", position · club, relative timestamp. Own actions visually distinguished (accent-tinted name) from others.

### 3.10 Re-auction & Prices
- Nav: back-chevron, "RE-AUCTION" + a round tag (e.g. "QF").
- Accent banner explaining the between-rounds mechanic: eliminated clubs' players are cleared from every squad and refunded; prices are re-rated on recent form.
- 3-stat row: Refunded (£ total returned to your budget) / New Budget / Open Slots.
- **"Cleared From Your Squad"** list: struck-through player names, club-eliminated note, refund amount per player.
- **"Weekly Re-rating"** list with a Risers/Fallers segmented sort: each row shows avatar, name/position/club, the stat-driven reason ("3 goals, 2 assists in R16", "Benched in R16 2nd leg", etc.), new price, and a signed delta (colored accent for rises, neutral for falls). **This is the general weekly price-update mechanism** — it should run every gameweek based on real stats (minutes played, goals, assists, clean sheets, cards), not only between knockout rounds.
- CTA "Enter Re-auction" → Live Auction screen.

### 3.11 Exposure & Risk
- Nav: back-chevron, "EXPOSURE" title, current round tag.
- Header stat block: big "% of points at risk" figure + one-line summary naming the biggest single contributor (e.g. "Bayern alone carries X%").
- **Club Exposure** cards: one per club you're exposed to — player count, total points from that club, a proportion bar, the current tie/scoreline context, and a risk chip (Low/Medium/High) with card border/fill escalating for High.
- **Round Timeline**: League phase → Round of 16 → Quarter-finals → Semi-finals, each with a status dot (done/live/next/future) and a short note.

### 3.12 Predictions
- Nav: back-chevron, "PREDICTIONS", gameweek tag.
- 3-stat row: Accuracy % / Streak / Bonus Points earned.
- **"Top Scorer This Week"**: a selectable list of managers (radio-style rows) predicting who scores most this gameweek; correct = 5 bonus pts, correctly calling yourself = 8 pts.
- **"Score Calls"**: 3 upcoming fixtures, each with a Home/Draw/Away 3-way selector per match.
- **Prediction Table**: Manager / Hit / Miss / Bonus, current user row highlighted.

### 3.13 Head to Head
- Nav: back-chevron, "HEAD TO HEAD", gameweek tag.
- Scoreboard: You vs Opponent, big score numbers either side of a vertical divider, a horizontal proportion bar below, and a status line ("Leading/Trailing {opponent} by N points — N players still to play").
- **Differentials**: players unique to one side, tagged which side, with their point contribution.
- **H2H Table**: Manager / W / D / L / Pts league table for the head-to-head format specifically (separate from the main standings ladder).
- **Next Fixtures**: upcoming H2H opponents by gameweek.

### 3.14 League Chat
- Nav: back-chevron, "League Chat" title, league-name tag.
- Standard chat thread: bubbles right-aligned/tinted for the current user, left-aligned/plain for others; sender name + timestamp above each bubble.
- Bottom input bar: text field + send icon button; Enter key sends. New messages append and the current user's messages are tagged "Sen"/"You".

### 3.15 Rules & Scoring
- Nav: back-chevron, "RULES & SCORING".
- Sections (static content, plain paragraphs/tables): **Transfer Window** (auto-squad-on-miss rule), **Auction** (sealed bids, highest wins, unsold → open sale), **Player Ownership** (one player per manager per league, locked until next window), **Squad Rules** (15-player squad, 1 GK/3-5 DEF/3-5 MID/1-3 FWD starting XI, 4-player bench, £120M budget, max 3 players per club), **Scoring table** (goal by position, assist, clean sheet by position, cards, captain ×2).

### 3.16 Match Results
- Nav: back-chevron, "MATCH RESULTS", a "GAMEWEEK N · FT" tag.
- List of fixture cards: home team / score / away team, plus a sub-row with the match date and "{N} pts from your squad" attribution.

### 3.17 Matchday Live
- Nav: back-chevron, "MATCHDAY" title, a "Live" chip.
- Accent header block: big live point total, your league rank + delta since kickoff, players-still-to-play count.
- 3-way sub-tab: **Feed** / **My XI** / **League**.
  - *Feed*: minute-by-minute event list (minute, player, action, match context, points delta) — own players' events are emphasized (accent), others' are muted, with the scoring manager's name attached to non-own events.
  - *My XI*: each starter with a live-state dot (playing/upcoming/unused-bench), a status caption (minutes/goals/cards), and live points.
  - *League*: a live-updating table (Manager / Live points / players still to play) with up/down movement arrows since kickoff.

### 3.18 Manager Profile
- Nav: back-chevron, "MANAGER".
- Header: large avatar, coach name, "{team} · {league}", a badge (e.g. "Reigning champion").
- 3-stat row: Squad Value / Signings count / Best Gameweek.
- **Season Form** bar chart: one bar per gameweek, height proportional to points, the season-best bar highlighted in accent.
- **Signing History**: each past signing with acquisition route (Auction / Open sale / Waiver), price paid, and points return (colored by sign).
- **Career** stats list: seasons played, league titles, auctions won, best finish.

### 3.19 League Pass (paywall)
- Nav: close (X), "UPGRADE".
- Accent hero block: "One payment, whole league / Run the season unlocked" — the commissioner pays once, every manager in that league plays free.
- **3 selectable plan cards** (radio-style, tap to select): 
  1. **League Pass** — season fee, unlocks custom scoring, up to 20 managers (free tier caps at 8), blind auction rounds + 60s extension, knockout re-auctions, head-to-head schedule.
  2. **Club Identity** — one-off, crest/kit designer, manager badges, a custom engraved trophy.
  3. **Season Book** — end-of-season fee, a printed record of the season (every auction, every gameweek, final table) posted to the champion.
- **"What Unlocks"** checklist (6 items matching the League Pass benefits above).
- **"Never For Sale"** list — explicitly rules out: extra transfers/bonus budget, waiver-priority skips, last-second bid rights/auction extensions, rival budgets or any hidden information, matchday ads. This list is the monetization guardrail: **the business model must never sell competitive advantage or hidden information — only capacity (league size), presentation (identity/keepsakes), and league-run features (custom scoring, blind rounds, re-auctions)**.
- Bottom: primary purchase button (label follows the selected plan) + a "Stay on free" ghost button.

---

## 4. Cross-cutting systems

### 4.1 Internationalization (EN / TR)
- A single language switch (Login screen, top-right) sets the whole app's locale — implement as a proper i18n layer (e.g. `react-i18next`/`FormatJS`/platform localization), not string concatenation.
- Every screen's static copy, nav titles, button labels, table headers, status chips, and category labels must exist in both English and Turkish. The prototype's dictionary keys to carry over include (non-exhaustive — audit every screen for full coverage): tagline, field labels/placeholders, auth buttons, onboarding steps (title+body×3), tab labels, phase labels (Locked/Open/Closed), hero copy per phase, stat labels (Rank/Total Points/Squad Value/Budget Left/Free Transfers/Shortlisted/etc.), all "more" list item titles, category headers (Matchday/Auction/Compete/Info), auction status labels (Leading/Outbid/Open/Sealed/Bid In), waiver/claim labels, captain sheet labels (Make/Remove Captain, "Swap with", no-bench-options message), chat placeholder, rules/scoring body copy, paywall plan names+details+unlock/never-for-sale lists.
- Turkish current-user labels use "Sen" where English uses "You"; relative timestamps localize ("2m" → "2dk", "Just now" → "Az önce").

### 4.2 Player ownership & the auction economy
- **Single source of truth**: a player record's `ownerId` (or null) determines availability everywhere — Transfers list, Auction lots, Draft Feed, and squad selection all read/write the same ownership state. A player owned by another manager must never be selectable.
- **Auction flow**: sealed/blind round (hidden rival bids, only bid-count visible) can toggle to a live round (all bids visible, outbid alerts, 60-second anti-snipe extension on late bids). Bids are held against free funds until the window closes; highest bid per lot wins and that player's `ownerId` is set; unsold lots become available at list price once the transfer season officially opens.
- **Waivers**: a separate pool for players released by injury/elimination/manager drop; claim priority is strictly reverse-standings (worst-placed manager first), resetting each week.
- **Re-auction between knockout rounds**: on elimination, every squad is swept for players from the eliminated club, those slots are refunded to budget, and a fresh short auction window opens for the freed slots — with **weekly price re-rating** (independent of eliminations) driven by real per-player stats (minutes, goals, assists, clean sheets, cards, rotation risk) each gameweek.
- **Automatic squad assignment**: any manager who has not confirmed a squad/transfers by the deadline gets an automatically-generated legal squad from their remaining budget — implement as a deterministic backend job at window-close, not a client-side fallback.

### 4.3 Squad rules (validate server-side)
- 15-player squad: 1 GK / 5 DEF / 5 MID / 3 FWD slot pool typical, with a legal starting XI of 1 GK, 3–5 DEF, 3–5 MID, 1–3 FWD (11 total) and a 4-player bench.
- Budget cap £120M (configurable per league at creation).
- Max 3 players per real-world club per squad.
- Exactly one captain among the starting XI at all times; captain's points count double.
- Swapping a starter with a bench player must enforce same-position swaps only in the UI (as prototyped) — decide server-side whether cross-position swaps are ever allowed (the prototype restricts to same-position).

### 4.4 Scoring
- Goal: FWD/MID 5/6 pts, DEF/GK 7/8 pts. Assist: 3 pts. Clean sheet: DEF/GK 4 pts, MID 1 pt. Yellow card: −1. Red card: −3. Captain: ×2 total.
- Live points must update in near-real-time during matches (Matchday Live feed) and roll up into gameweek totals, league standings, and head-to-head scores.

### 4.5 Head-to-head format
- Independent of the overall league ladder: a round-robin or scheduled weekly-duel format with its own W/D/L/Pts table. With an odd manager count, exactly one manager sits out each week (surface this in league-setup as the "N managers · odd…" hint).

### 4.6 Predictions / engagement layer
- Weekly "top scorer" manager prediction (5 pts correct / 8 pts self-correct) and fixture-outcome (home/draw/away) predictions feed an accuracy %, streak, and bonus-points ledger — purely a side-competition, does not affect squad scoring.

### 4.7 Elimination risk
- Compute, per club currently represented in a manager's squad, the share of that manager's total season points sitting with that club, and a qualitative risk tier (Low/Medium/High) informed by the current tie/scoreline. Surface the aggregate "% of points at risk" and the single biggest contributor.

### 4.8 Monetization guardrails (see 3.19)
- League-scoped purchase (one commissioner payment unlocks the whole league) is the primary paid unit — not per-seat subscriptions.
- Paid tier unlocks: league capacity increase (8→20 seats), custom scoring config, blind-auction mode + anti-snipe extension, knockout re-auction rounds, head-to-head scheduling, cosmetic identity (crest/kit/trophy designer), and a printed/exportable season book.
- Explicitly never sell: extra transfers, bonus budget, waiver-priority jumps, last-second bid rights/extensions, hidden information (rival budgets, price forecasts), or matchday advertising.

---

## 5. Data model sketch (for backend design)

```
Manager { id, name, teamName, avatarInitial, leagueId }
League { id, name, managerCap(4-20), budgetPerManager, auctionOpensAt, auctionClosesAt, inviteCode, scoringConfig, isPro }
Player { id, name, club, position(GK|DEF|MID|FWD), basePrice, currentPrice, ownerId(nullable), formHistory[] }
Bid { id, lotId(=playerId), managerId, amount, isBlind, submittedAt }
SquadSlot { managerId, playerId, isStarting, isCaptain, isBench }
Fixture { id, homeClub, awayClub, kickoffAt, homeScore, awayScore, round }
MatchEvent { id, fixtureId, playerId, minute, type(goal|assist|yellow|red|save|...), pointsDelta }
Prediction { managerId, gameweek, topScorerPick(managerId), fixturePicks[{fixtureId, pick}] }
WaiverClaim { managerId, playerId, priority, claimedAt }
ChatMessage { id, leagueId, managerId, text, sentAt }
```

---

## 6. What NOT to copy literally

The bundled HTML file (`Touchline Fantasy.dc.html`) is a **design + interaction reference only**, built in a prototyping DSL (custom template bindings, inline styles, a single-file component). Do not port its markup or its inline-style approach into production. Recreate the visuals using the target platform's real styling system (CSS-in-JS / SwiftUI modifiers / Jetpack Compose / Tailwind, etc.), driven by the Modernist token values listed in section 1, and back every interaction in section 3 with real state/network logic per section 4–5.

## 7. Files in this handoff

- `Touchline Fantasy.dc.html` — the interactive design prototype (open in a browser to click through every screen and state described above).
- `_ds/modernist-*/` — the Modernist design-system source (tokens in `styles.css`, full guide in `readme.md`) referenced by the prototype.
