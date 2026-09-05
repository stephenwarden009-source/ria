# RIA — Phases 1–3 build (2026-09-05)

Applied on top of commit `9644078`. Three files changed: `index.html`, `smoke.js`, `sw.js`.
Test suite: **62/62 passing** (was 39/39 — 23 new assertions).

Run: `npm install playwright && npx playwright install chromium`, then `node smoke.js`.

---

## Phase 1 — Storage

- **Photos moved to IndexedDB as blobs.** `localStorage` held base64 (~33% overhead) against a ~5MB cap; two iPhone photos could crowd out the check-in log. State now stores `{id, k}` and the blob lives in the `ria-photos` object store.
- **Automatic v1→v2 migration.** Any existing base64 photo is lifted into IndexedDB on first boot, then dropped from state. Decoding is done by hand via `atob` — deliberately **not** `fetch()` on a data: URL, so the zero-network guarantee stays literally true and testable.
- `schemaVersion: 2` added to state.
- **Storage readout in Settings** — photo/check-in/re-entry counts plus `navigator.storage.estimate()` where available, so the cap is visible before it's hit.

## Phase 2 — The user can see their own data

- **New "Your pattern" view on the Support tab.** Previously `checkinLog[]` was written and never displayed — the calendar showed ✓/missed dots only, and the answers were invisible to the user who wrote them.
- Every check-in listed with its answers in the user's own words.
- **Urge intensity plotted over the last 90 entries, with re-entry days marked** as dashed verticals on the same axis. This is the product's core claim made visible instead of asserted.
- No scores, no grades, no streak language — observation, not evaluation.

## Phase 3 — Usage ledger + backup

- **`S.usage` ledger. Counts and dates only, never content.** Sessions, red-mode entries, timer starts/completions, tool opens by name, contact taps, crisis-bar taps, check-in and re-entry counts, export count.
- **Crisis-bar taps are counted; outcomes are not.** Delegated capture-phase listener on `a.crisis-act`. This is the only signal that says the app routed someone to a human.
- A test asserts the ledger contains no free text the user wrote.
- **Backup export** — full JSON including photos as data URLs. Web Share API where available, download fallback.
- **Restore from backup** — `#s-restore` file input in Settings, with a real round-trip test.
- Settings states plainly that data exists only on this device, and that the backup file is unencrypted.

## Not built (deliberate)

- **De-identified research export.** Deferred until a named recipient and ethics approval exist. Shipping a consent flow with nothing behind it is a trust liability.
- Automated silence detection — rejected on principle, see blueprint §8.

---

## Still open

1. **iOS Safari device pass — unchanged and still gating.** Now also needs: photo capture into IndexedDB on iOS, `navigator.share` file handling from an installed standalone PWA (unreliable in that context), and the restore file picker.
2. `sw.js` cache bumped to `ria-v11`. **Deploy the SW change together with `index.html`** or returning users get the old app from cache.
3. `_redirects (1)` filename — still broken, still P1. `git mv "_redirects (1)" _redirects`.
4. Two dead test files still served publicly at the site root.
