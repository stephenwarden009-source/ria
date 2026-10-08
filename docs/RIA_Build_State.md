# RIA — Build State & Working Context

_Last verified: 2026-09-07. `main` at `5f9e23c`, pushed, deployed, and **confirmed running on an Android device**. Source of truth for what actually exists in code, as opposed to what the blueprint describes._

> **How to keep this doc honest:** re-read the code before editing it. An earlier revision described commit `9644078` and was two commits stale — it undercounted the app by 263 lines and 23 test assertions, and listed three defects that had already been fixed. `CHANGES.md` in the repo is stale in the same way (see §5).

## 1. Canonical sources

| Thing | Location |
|---|---|
| Product blueprint | `docs/RIA_Product_Blueprint_v2.md` |
| Code | `github.com/stephenwarden009-source/ria` — `main` at `5f9e23c` |
| **Live app** | **https://stephenwarden009-source.github.io/ria/** — GitHub Pages, **auto-deploys on push to `main`** |
| Local clone | `/Users/a00000/ria` on the author's MacBook Pro |
| Rollback point | tag `pre-rebuild-2026-09-04` (= `9e8300f`) |
| In-repo changelog | `CHANGES.md` — covers the 2026-09-05 build, **stale** |
| Earlier design prototype | `cold-cherry-007a.stephenwarden009.workers.dev` — see §9 |

**The live URL is the `/ria/` path.** The bare `stephenwarden009-source.github.io` root 404s — nothing is published at the user-site root, and the service worker's scope is `/ria/` regardless. Install and share the full path.

The repo is **public**, so it clones read-only over HTTPS with no credential. **Pushes go over SSH** (`git@github.com:...`) and work; the HTTPS remote returns 403 from a stale credential in the macOS Keychain, not a repo permissions problem.

`_redirects` is **inert on GitHub Pages** — Pages ignores the file. It is a Netlify/Cloudflare Pages artifact and is not providing the SPA fallback anyone assumed. Harmless today (single-page app, service-worker navigation fallback), but do not rely on it.

**Note for agent sessions:** the shell reachable on the author's machine mounts the real repo but runs in its own Linux VM with a separate `$HOME`. Consequences: `git commit`/`git am` there fail with "Committer identity unknown" (his `~/.gitconfig` is not mounted — do **not** fix this by writing a `--local` identity into his repo), and `node smoke.js` there uses that VM's Playwright cache, not the Mac's, so it cannot stand in for a macOS suite run. Both belong in the author's own Terminal. Delivering a patch works well: write the `.patch` into `/Users/a00000/ria`, he runs `git am`.

## 2. Repo contents (commit `5f9e23c`)

```
index.html                1963 lines   LIVE APP — "RIA — Relapse Interception App"
index-stable-v1.html       428 lines   rollback copy (= the pre-rebuild tag)
index-broken-test.html    1396 lines   dead
index-broken-test-2.html  1094 lines   dead
sw.js                      123 lines   service worker, cache "ria-v15", network-first navigations
smoke.js                   468 lines   Playwright suite, 107 assertions
CHANGES.md                  45 lines   narrative changelog for the 2026-09-05 build — stale
manifest.json               26 lines   PWA manifest
_redirects                   1 line    inert on GitHub Pages — see §1
package.json / package-lock.json      test harness only — the app itself has no deps
.gitignore / .nojekyll
docs/                                 this file + the product blueprint
icons/                                icon-192.png, icon-512.png, icon.svg
README.md                             still a single line: "# ria"
```

Architecture: **single-file vanilla JS PWA.** No framework, no build step, no bundler, no runtime dependencies. State in `localStorage`; photo blobs in **IndexedDB** (`ria-photos` object store). No backend. The npm files exist solely for the test harness.

## 3. What is actually built

**Navigation (7 tabs):** Home · Urgent · Reset · People · Moment · Support · Tools

**Onboarding:** 5-step wizard (`ob0`–`ob4`) with progress dots, back nav, per-step validation, and a summary card built from entered data.

**State keys:** `name, days, startDate, cycle, substance, region, tone, customCrisis, contacts[], triggers{emotional,situational,signals}, affirmation, loss, clean, bingeAmt, bingeFreq, music, show, clip, pod, memories[], checkins[], checkinLog[], relapses[], mood, chatHistory[], redMode, schemaVersion, usage{}`

**Implemented:** onboarding wizard + validation; state persistence with `deepMerge` migration; clean-time math off `startDate`; region-scoped crisis resources; drift-weighted risk banner; red mode with tone-varied copy; support contact actions (real `tel:`/`sms:`); 10-minute delay timer; animated 4-4-6 breathing ring; accordion tool cards; My People + Pets photo grid backed by IndexedDB; persisted daily check-in; persisted post-relapse re-entry; affirmation carousel; canned-response matcher with crisis interception; light/dark theming; flash toasts.

**Added 2026-09-05 (`44ee1a3`):** photos in IndexedDB with v1→v2 migration; the **"Your pattern"** view in Support; the **usage ledger** (`S.usage`, counts and dates only) plus full backup/restore.

**Added 2026-09-07 (`141290b`) — data integrity and the drift score:**

1. **The intensity slider stopped inventing numbers.** It shipped at `value="5"` and `openCheckin()` reset it to 5 on every open, so `submitCheckin()` wrote 5 whether or not it was touched. Now: Urges "None" hides the slider and records `0`; otherwise the value is recorded **only if the user moved it**, else `null`. `renderPattern` treats `null` as a gap — line breaks, no dot, row shows a dash, caption names the unrated count.
2. **v2→v3 migration.** Clears every stored `intensity === 5` dated before `2026-09-07`. Destructive by design and signed off. **Confirmed run on the author's device 2026-09-07** — his historical 5s are now dashes.
3. **Drift score reads only fresh check-ins.** `CHECKIN_FRESH_DAYS = 2`.
4. **Floor statement on Home.** "RIA only sees what you tell it. A quiet screen isn't a safety check — you know things it doesn't." **Confirmed visible on device.**

**Added 2026-09-07 (`12a2853`) — network-first service worker.** Navigations go to the network first with a 2.5s cap and fall back to the cached shell; other GETs are cache-first with a background refresh; cross-origin requests are no longer intercepted. Every successful navigation replaces the cached shell, so the offline fallback is the last good version rather than the version first installed, stored under a fixed `index.html` key so query strings cannot fragment the cache. Offline behaviour is unchanged. Written in response to the Android stranding incident in §5.

**Added 2026-10-08 — app description and the no-surveillance copy rule.** Onboarding step 0 opens with a user-facing description (`#about-ria`), replacing "Let's build your RIA." Settings gains an **About RIA** block that copies `#about-ria` at open time (`aboutReadout()`), so there is one source. Copy rule, now tested: the user is the subject of every input verb; UI copy never says RIA watches, tracks, monitors, notices or detects. Two existing lines broke it and were reworded — step 1 "RIA watches for these" → "RIA keeps these for you", and the high-risk banner "Drift detected." → "Your pattern is showing." Four new assertions, including a regex guard over UI text that fails on the pre-change copy. `ria-v18`.

**Added 2026-09-07 (`5f9e23c`) — build readout in Settings.** Reports `SHELL_BUILD` (identifies `index.html`), the Cache Storage keys (identifies what the worker is serving), and the worker's own state — including "update ready — close and reopen the app", the one actionable case. When shell and cache disagree the device is mid-update or stuck. **Confirmed showing `ria-v15` on the author's Android device.**

**Verified 2026-09-06:** zero `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `navigator.geolocation` in `index.html` — asserted on every suite run, so it still holds. The only outbound URLs are four meeting links. The "everything stays on device" claim **holds in code today.**

**Test coverage:** `smoke.js` — Playwright, **107 assertions**, all passing (Linux container, 2026-10-08; last confirmed on the author's Mac at 93, 2026-09-07).

```bash
npm install playwright && npx playwright install chromium
node smoke.js
```

Gotchas worth an hour each:

- **First launch after installing Chromium can time out on macOS.** Gatekeeper verifies the new binary and the first `page.click` burns its 30s budget, surfacing as a locator timeout that looks exactly like broken app code. **Re-run it.** If it fails twice, it is real.
- **`PLAYWRIGHT_CHROMIUM`** overrides the browser binary. In the cloud container the working value is `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; a fresh `npm install playwright` there pulls a newer build number than the preinstalled browser and fails until this is set.
- **The service-worker assertions are source-level only.** Playwright over `file://` cannot register a worker. They stop a future edit silently reverting navigations to cache-first; they prove nothing about runtime.

**Closed blind spot:** check-in assertions used to inject `checkinLog` directly into state, so no test ever drove the check-in UI — precisely how the slider default survived 66 green assertions. The 2026-09-07 additions open the modal and press the buttons. **Keep that habit: state-injection tests cannot catch input bugs.**

## 4. Hard product rules (non-negotiable)

1. **No live AI counselling or advice, ever.** The Moment tab is a keyword→canned-response matcher (`aiReply`). It must never be wired to an LLM API.
2. **On-device only.** No servers, no accounts, no sync, no feeds, no followers.
3. **RIA is never a monitored service.** The only monitoring is the user monitoring themselves, through functions they opt into. This rules out blueprint Level 4 and any server-side heartbeat.
4. **Post-relapse module is non-shaming.** Relapse becomes data, not identity failure.
5. **No gamification of crisis.** XP / "urges stopped" scoring was deliberately rejected — see §9.
6. **Day 1 is the day you stop**, not day 0. `getDaysClean()` returns `daysBetween(startDate) + 1`. Do not "fix" the +1.
7. **Never claim a save succeeded without confirmation.**
8. **The issue list is append-only.** `S.substance` stores the option's literal string; relabelling orphans it.
9. **Never record a number the user did not enter.** A widget default written to `checkinLog` is indistinguishable from a real answer. Unrated is `null` and renders as a gap, never a zero.
10. **The drift score is a mirror, never a verdict.** The integer must never appear in the UI or in any export a clinician could read as an assessment. A quiet app must never read as a safety clearance — hence the floor statement. See §11.
11. **A user must always be able to tell which version they are running, and the app must always be able to update itself.** The crisis numbers ship inside `index.html`; a device stranded on an old shell is a safety failure, not a cosmetic one. See §5 and §12.

## 5. Open defects

**P1 — iOS Safari has never been exercised.** Four surfaces, none tested: `tel:`/`sms:` handoff from an installed standalone PWA; photo capture into IndexedDB; `navigator.share` file handling from standalone (unreliable there); the restore file picker. The backup fix's `AbortError` and iOS-standalone branches were written for iOS behaviour and have never executed on iOS.

**P1 — an installed Android PWA stranded itself on an old shell (2026-09-07).** Observed, not theorised: across two deploys and repeated force-stops, the installed app kept serving the old `index.html` while the same origin served current content in a browser tab. Chrome listed the origin **twice** in site settings with different storage sizes (2.6MB and 633kB), consistent with the installed WebAPK and the browser context holding separate registrations. Force-stop does not clear a service worker or Cache Storage.

**What broke the deadlock:** opening `https://stephenwarden009-source.github.io/ria/` in a normal Chrome tab. The app visibly hard-reloaded and came back current. No data was lost and the destructive clear was never needed.

Why this is P1 rather than a nuisance: a stranded install means a user can be running old crisis numbers indefinitely, with no signal to them and no remote way to fix it. Every fix for the condition lives in the shell that cannot update — so **the escape hatch has to ship before it is needed.** `ria-v15` is the first build that recovers on its own; anything already stuck must be cleared by hand, which for a real user means losing their data unless they knew to back up first. This is a stronger argument for the native graduation path (§7) than the reminders constraint is.

**Still to do on Android:** confirm the check-in slider behaves under touch (reads "not set", hides on Urges → None, records a moved value), and confirm a `tel:` link dials from the installed app.

**P2 — backup/restore has still never run on a device.** It came close on 2026-09-07 — the plan was export, verify, clear, restore — but the browser-tab reload made it unnecessary. It remains untested end to end anywhere but Chromium.

**P2 — `CHANGES.md` is stale and contradicts the repo.** Predates every 2026-09-06 and -07 change. Either keep it current or delete it and let this doc carry the history.

**P2 — 2,490 lines of dead code in repo root**, publicly served at `/index-broken-test.html` and `/index-broken-test-2.html`. Should be branches or tags.

**P2 — README is one line.**

**P2 — the blueprint is stale in three places** (introduced when it was written at `9644078` and never revised): §6 and the v2 header cite that commit; §14 claims a 39-assertion suite where the current suite has 93; §7.1 describes the service worker as cache-first precaching, which is the behaviour `12a2853` deliberately replaced after the Android stranding incident. §14's status table also duplicates §6 of this document and is the source of the drift. See §13.

### Resolved

**2026-09-07 (`5f9e23c`) — no way to tell which build a device was running.** Cost two debugging sessions; the answer was only reachable over USB and `chrome://inspect`, so nobody checked and a stale install looked identical to a current one. Settings now reports shell build, cache keys, and worker state.

**2026-09-07 (`12a2853`) — cache-first navigations let a shipped fix sit unseen.** See §3.

**2026-09-07 (`141290b`) — the intensity slider recorded a phantom 5/10.** Found by reading the author's own log: checking in daily as "None / Connected", never touching the slider, every entry stored `intensity: 5`. The 90-day chart — the app's only quantitative history — was a flat line at a widget default, with rows reading `5/10 · Urges: None` and contradicting themselves on screen. Fixed per rule §4.9. Historical repair destructive and signed off.

**2026-09-07 (`141290b`) — the drift score read stale check-ins as current.** `lastCheckin()` returned the most recent entry at any age, so one "gone dark" followed by silence carried +3 indefinitely and sat in permanent red. Now bounded by `CHECKIN_FRESH_DAYS = 2`.

**2026-09-07 (`141290b`) — no floor statement.** The false negative (no banner, user about to use) read as clearance.

**2026-09-06 (`6001890`) — backup reported false success.** `exportBackup()` called `showFlash('Backup saved ✓')` unconditionally after `a.click()`. Cancelling the share sheet rejected `navigator.share`, fell through to the download path, and reported success anyway. Rewritten so success is only claimed when something confirmed it.

**2026-09-06 (`6001890`) — issue list desync + gaps.** Extracted to a single `const ISSUES`; added Nicotine / vaping and Gaming.

**2026-09-09 — docs lived outside the repo.** This file and the blueprint were held in the Claude project and exported by hand to `.pages`/`.pdf`, producing three copies of build state and two of the blueprint, all drifting. Both now live in `docs/` and are edited in the same commit as the code they describe.

**Deliberately not added to the issue list:** food / compulsive eating — RIA's spine maps badly onto eating, and eating-disorder crisis routing needs different helplines than 9-8-8/NORS. Self-harm is handled as a crisis keyword, not a trackable category. Benzodiazepines/sedatives raised and declined for now.

## 6. Blueprint vs. build — gap map

| Blueprint section | Status |
|---|---|
| 2. Onboarding / intake | Built — 5-step wizard, validated |
| 3.1 Cycle engine | Partial — days-clean math built; cycle proximity feeds the drift score |
| 3.2 Drift detection engine | Partial — `getDriftScore()` weights missed check-ins, cycle proximity, time of day, and (only if logged in the last 2 days) isolation, urge strength and self-flagged warning signs. No predictive model, no background execution. See §11 |
| 3.3 Intervention escalation L1–L3 | Partial — drift banner (L1) → red mode (L2) → alert-my-people (L3); no formal ladder |
| 3.3 Level 4 | **Rejected on principle** — see §4.3 and §7 |
| 4. Moment-of-choice (if X → then Y) | Partial — buy10 timer + urgent tools; no user-defined if/then rules |
| 5. Dopamine reward system | Partial — money-saved tally, photo grid, media, check-in calendar |
| 6. Reality panel | Built (People tab) |
| 7. Daily check-in | Built, persisted, shown back, and no longer fabricating an intensity |
| 8. Post-relapse module | Built — persisted to `relapses[]` |
| 9. Customization / learning layer | Partial — tone and saved triggers personalize copy; no learning loop |
| — De-identified research export | **Not built, deliberately.** Deferred until a named recipient and ethics approval exist |

## 7. The Level 4 fork — resolved

Blueprint Level 4 ("if user unresponsive → notify primary contact, optional location share") is **not a backlog item and not an architectural blocker. It was rejected on principle** under rule §4.3.

The replacement is a **human layer**: the app helps the user draft a silence agreement ("if you don't hear from me in X days, call me") which **the user sends from their own phone**. The app never watches, times, or notifies. **Not built yet.**

The residual technical constraint stands: reliable self-directed reminders need a native app. **The Android stranding incident (§5) strengthens this considerably** — a web app that can silently freeze on old crisis content, with no remote remedy, is a second independent argument for native. Native remains the **graduation path**, not an immediate rebuild; the PWA stays the validation vehicle.

## 8. Crisis resources — how to add a territory

**Primary market is Canada, other territories planned.** Crisis lines live in the `REGIONS` object at the top of the script block, so adding a country is a data change:

```js
REGIONS.AU = { label:'Australia', lines:[ {name, tel, sms?, smsBody?, url?, note} ] };
EMERGENCY.AU = '000';
```

Users in an unlisted country pick "Other" and enter their own line, stored in `S.customCrisis`.

Currently shipping, each verified against the operator's own site on 2026-09-04:
- **CA (default):** 9-8-8 Suicide Crisis Helpline (call or text, 24/7, EN/FR); NORS, 1-888-688-6677. Emergency 911.
- **ON (Canada — Ontario, added 2026-09-19, `ria-v17`):** 988, then ConnexOntario (1-866-531-2600, text CONNEX to 247247, connexontario.ca — verified 2026-09-19), then NORS. Emergency 911. Provincial lines get their own region so a user outside the province never sees a line that cannot serve them; national lines are shared constants (`CA_988`, `CA_NORS`) so they cannot drift between CA and ON.
- **US:** 988 Suicide & Crisis Lifeline; SAMHSA National Helpline 1-800-662-4357. Emergency 911.

**Rule:** never add a number to a crisis path without checking it against the operator's own site first. A wrong number here is the worst bug in the app — and per §5, a wrong number on a stranded device cannot be corrected remotely.

## 9. Old prototype vs. stable build

The worker deploy at `cold-cherry-007a...` is an **earlier design prototype**, not an earlier version of this codebase. It looks roughly 3× more finished and does about 40% as much.

**What was wrong with it:** 26 trigger chips that only toggled a CSS class and never saved; contacts as free text with fake "Calling X..." toasts instead of `tel:` links; a static days-clean integer; raw base64 photos that hit the ~5MB cap in about two iPhone photos; check-in and re-entry answers discarded; `interrupted: 3, xp: 62` hardcoded into `DEFAULT_STATE` so every new user started with fake progress; correct crisis numbers behind a toast rather than a dialable link; a 1.4s typing indicator performing an LLM that isn't there.

**What was ported:** the 5-step onboarding wizard (with validation the prototype lacked); persisted trigger and warning-sign chips, which now seed the check-in, populate the re-entry options, and are quoted verbatim in the drift banner; the re-entry module; the daily check-in modal; the crisis bar rebuilt with real `tel:`/`sms:` links and region scoping; accordion tools, breathing ring, scripts; a functional tone selector; the affirmation carousel.

**What was deliberately rejected:** the XP / "urges stopped" system — it ships fake progress, and gamifying crisis events creates an incentive to self-report them. Also rejected: the free-text contact model, uncompressed photo handling, `state.days` as a stored integer, and the chat typing indicator.

**A separate April-2026 prototype dump sits at `~/Desktop/RIA/`** on the author's machine: five `index_expanded_ria_shell*.html` variants, four `ria-pwa` folder copies, `preview.html`, `ria_clean_rebuild.html`, screenshots. Nothing touched since 22 April. Unrelated to this repo — archive or delete it; it is a folder of files named `index*.html` that are not the app.

## 10. Next-session pickup

**Blocking: the iOS Safari device pass (§5).** The crisis path and the backup path are load-bearing and have only ever run in headless Chromium.

**Now also blocking-adjacent: finish the Android pass.** The device is current at `ria-v15`; what remains is the check-in slider under touch and a `tel:` dial from the installed app.

**Deploy rules:**

1. Always ship `sw.js` and `index.html` in the same deploy.
2. **Bump `CACHE` in `sw.js` and `SHELL_BUILD` in `index.html` together, every time.** If they drift, the Settings readout starts lying, which is worse than not having it.
3. GitHub Pages auto-builds on push to `main`; allow a minute before concluding a deploy failed.
4. Verify by loading the live URL and reading Settings → **This version**. Two taps, no cable.

**Repo housekeeping** (§2, §5): reconcile or delete `CHANGES.md`, move the two dead test files to branches, write a real README.

**Docs:** reconcile the blueprint against §13 — the stale-claims fix is small and should land before the doc is shown to anyone.

**Product:** blueprint §4 (user-defined if/then rules) and §9 (learning layer) both now have the data they need, and as of `141290b` the intensity series is trustworthy enough to build on. The silence-agreement drafting flow (§7) is specified and unbuilt.

## 11. The drift score — settled reasoning (2026-09-07)

Whether to have a score at all was reopened and resolved: **keep the mechanism, never let it become a verdict** (rule §4.10).

**Why a score stays.** The banner shows or it doesn't; that decision is a threshold over inputs no matter how it is written. Deleting `getDriftScore()` does not remove scoring, it scatters it into unauditable `if` statements. More importantly, aggregation *is* the product thesis: drift is compound — several weak signals, none alarming alone. Day 27 of a 30-day cycle is nothing; pulling back is nothing; a missed check-in is nothing; the three together are the thing the app exists to catch. A one-rule-per-signal architecture cannot express that. And the score is the only mechanism in RIA that moves before the user asks.

**Why the concern is still right.** A visible score invites the same perverse incentive that killed XP (§9): users learn which answers summon the banner and answer to avoid it. The false negative — no banner reading as clearance — was the sharper harm and is now addressed by the floor statement. Alarm fatigue from stale check-ins is now bounded.

**The line.** RIA may say *"here is what you told me, and it looks like the pattern you described."* It may never say *"you are at risk"* or show a number. A test asserts the banner emits reasons rather than a score.

**Uncertain / unresearched:** whether risk-scoring in recovery helps or harms is an empirical question with a real literature (ecological momentary assessment; just-in-time adaptive interventions in mHealth). No findings have been checked. Worth doing before any clinical-advisor conversation. The decisive question — *does the banner change what a user does?* — is answerable only with real users.

## 12. Update integrity — how a fix reaches a phone

Added after the Android stranding incident (§5), because this turned out to be a product property, not an ops detail.

**The chain:** push → GitHub Pages builds → browser fetches changed `sw.js` → worker installs → `skipWaiting`/`clients.claim` activate it → new shell served. Before `12a2853` the worker was cache-first for every GET, so **every link in that chain had to succeed or the user kept the old app forever, with nothing in the UI to say so.**

**What changed:** navigations are network-first with a 2.5s cap and a cached fallback, so a current device picks up a deploy on the next launch regardless of worker timing. Offline is unchanged — no signal means the fetch fails immediately and the cache answers.

**What is still true:** a device already stranded on a pre-`12a2853` shell cannot be rescued remotely. The known remedies, cheapest first: load the URL in a normal browser tab (worked on 2026-09-07); clear site data and restore from a backup (destructive, needs a verified export first); uninstall and reinstall.

**Design consequence:** any future recovery mechanism must ship *before* the failure it addresses, because the failure blocks delivery of its own fix. This is the case for a visible "last updated" line the user can sanity-check, and part of the case for native (§7).

## 13. Doc boundary — which file says what

Two documents, split by **volatility**, not by topic. The topic split (product vs engineering) is what let build status leak into both and drift.

**`docs/RIA_Product_Blueprint_v2.md`** — claims that survive a commit. What RIA is, what it refuses to be, why silence detection and XP were rejected, the safety boundaries, positioning. It should carry **no status labels, no commit hashes, no line or assertion counts.**

**`docs/RIA_Build_State.md`** (this file) — anything that changes when the code changes. Status, the gap map, defects, deploy rules, hashes.

**Reference direction is one-way:** this file cites blueprint sections. The blueprint never states build status.

**Outstanding surgery on the blueprint** (see §5, P2), not yet applied:

1. Delete §14 entirely; replace with a pointer to §6 of this file.
2. Strip `Status:` lines from §3, §4, §5, §9–§13. Decisions that are permanent (rejected on principle) stay; *not-yet-built* moves here.
3. Delete the commit citation in the v2 header and in §6, and the 39-assertion line in §14.
4. Rewrite §7.1 as a claim — no network calls, so nothing degrades — and drop the caching mechanics, which are now wrong.

**Exports are disposable.** These two markdown files are the sources. A `.pdf` or `.pages` is generated when it is being sent to someone and deleted afterwards; every kept export is a fork waiting to be read as current. Superseded exports from before 2026-09-09 are archived at `~/Desktop/RIA/_superseded-docs/`.
