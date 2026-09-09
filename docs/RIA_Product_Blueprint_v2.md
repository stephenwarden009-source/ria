# Relapse Interception App (RIA)

### Product Blueprint v2 — Personalized Addiction Pattern Interruption System

**Version 2.0 · 5 September 2026 · Supersedes Blueprint v1**

> v1 was written before the build existed. v2 reconciles the specification with what is actually shipping, and states plainly which parts are built, which are roadmap, and which cannot be built on the current architecture. Every capability claim in this document is verifiable against the codebase at commit `9644078`.

---

## About RIA

The Relapse Interception App is a private app for people whose relapses into damaging addictions and behaviours follow a pattern — the quiet drift before things fall apart.

It tracks sober time, but it is not a sobriety tracker. It does more than count days: it holds the user's own cycle, triggers, warning signs, and highest-risk windows, and uses them to interrupt the pattern in the moment.

Most people struggling with substances or destructive habits are also glued to their phones. RIA uses that. The phone you'd reach for to make the call becomes the thing that stops you first. When it senses drift or risk, it steps in with coping tools, live crisis lines, one-tap contact with family or sponsor, and the user's own reasons to deny the urge: the people, places, achievements and life they don't want to lose.

**Everything stays on the device.** No servers, no accounts, no sync, no sharing, no feeds, no followers. A private space, a refuge — not a feed built to keep you scrolling.

**It works with no signal.** RIA opens and does everything it does with no connection at all — see §7.1. The moment it exists for is not one anyone can spend waiting for a page to load.

**RIA is the step before the one you'll regret.**

---

## 1. Core Concept

RIA is a **pattern recognition and interruption system** for people with cyclical relapse behaviour (binge → disappear → return → repeat).

**Goal:** detect the drift before relapse and intervene in real time.

---

## 2. What RIA Does Not Claim

Stated explicitly, because the omission would be the more serious error:

- RIA is **not a medical device**, not treatment, and not a substitute for clinical care, medication, or a recovery programme.
- RIA provides **no counselling and no advice generated in the moment.** The in-app response system is a fixed, pre-written library — see §6.
- RIA makes **no efficacy claim.** No outcome study has been conducted. Its design rests on established harm-reduction and relapse-prevention principles, not on evidence of its own effect.
- RIA does **not detect overdose, medical emergency, or suicidal crisis on its own.** It routes the user to human crisis services when they signal distress; it does not monitor them.

**The governing rule, stated once:** *RIA is never a monitored service.* The only monitoring is the user observing themselves, through functions they switched on. Nothing in the product watches a user on anyone else's behalf, and nothing reports on them to anyone. Every design decision below follows from this.

---

## 3. User Onboarding (Deep Personalization Engine)

**Status: shipped.** Five-step wizard with per-step validation, back navigation, and a summary card generated from the user's own entries. The intake is deliberately serious in tone, not casual — it is the moment the product earns its use.

| Step | Captures |
|---|---|
| 1 | Identity, clean start date, cycle length, substance/behaviour, region |
| 2 | Triggers — emotional, situational, and behavioural warning signs |
| 3 | Support network + intervention tone |
| 4 | Consequence anchors — what's lost, what life looks like clean, personal media |
| 5 | Summary and confirmation |

**Pattern history:** cycle length, last relapse date, warning signs preceding relapse.

**Triggers:** emotional (lonely, bored, anxious), situational (home alone, payday, conflict), behavioural (late-night phone use, isolation, missed calls).

**Drift signals — the critical input.** The user names what changes right before they relapse: stops replying to texts, sleeps irregularly, cancels plans, screen time climbs. These are quoted back to them verbatim later, in their own words.

**Support network:** trusted contacts with real dial and text handoff, held in priority order.

**Consequence anchors:** personal photos, and two written statements — *what I lose when I relapse* and *what I want my life to be*.

**Intervention preferences:** tone (gentle / direct / hardline), which materially changes the app's language at every escalation level.

---

## 4. Core System Architecture

### 4.1 Cycle engine — *shipped*

Days clean are computed from the stored start date, never from a stored integer. **Day 1 is the day you stop**, matching how the count is spoken in rooms. Cycle proximity feeds the risk score.

### 4.2 Drift detection — *shipped, first pass*

A weighted score over: missed check-ins, proximity to the user's stated cycle point, logged isolation, urge strength, and self-flagged warning signs. Output drives a risk banner that quotes the user's own drift language back to them.

**Roadmap, not built:** predictive risk-window modelling ("Day 17 — entering your historical relapse zone") requires longitudinal data the app does not yet hold. It is an earned feature, not a launch feature.

**Ruled out on the current architecture:** passive phone-usage and communication-frequency monitoring. It cannot be done on-device in a browser-based app, and doing it any other way would require sending behavioural data off the device — which contradicts the product's central promise. See §8.

### 4.3 Intervention engine — *shipped through Level 3*

| Level | Behaviour | Status |
|---|---|---|
| **1 — Awareness** | Risk banner: *"You are entering your pattern. Interrupt early."* Quotes the user's own signals. | Shipped |
| **2 — Action required** | Red mode. Tone-varied copy, cannot be dismissed passively. Options: call support, leave the situation, 10-minute delay timer, guided 4-4-6 breathing. | Shipped |
| **3 — Critical** | Full-screen interruption showing the user's own photos and consequence statements: *"You've been here before. Choose differently now."* Escalates to one-tap contact of their people. | Shipped |
| **4 — Human layer** | A standing agreement between the user and their people: *"If you don't hear from me for four days, call me. Don't read silence as me being fine."* RIA drafts the wording in the user's tone and prompts them to send it from their own phone. The user chooses who, what and when; the contact receives a real ask and can decline. | Specified |

The escalation is currently graduated rather than a formal state machine. Formalising the ladder is a near-term engineering task, not a design question.

**Level 4 deliberately lives outside the software.** RIA does not time the silence, count it, watch for it, or act on it — no timer, no heartbeat, nothing transmitted. The noticing happens in a human being, which is also the only place it can lead to someone actually arriving. See §8 for why the monitored alternative was rejected rather than deferred.

---

## 5. Moment-of-Choice System

**Status: partial.**

Shipped: the 10-minute delay timer, the breathing ring, accordion tool cards (SOBER, HALT, scripts for real situations), and immediate access to contacts and crisis lines from every screen.

Roadmap: user-defined *if X → then Y* rules set during calm ("if alone at night → leave the apartment"; "if the urge hits → call [name]"). The data these rules need — triggers, check-ins, relapse history — now persists, so this is buildable next.

**Principle: no passive logging.** In the danger moment the app requires a choice, not an acknowledgement.

---

## 6. In-the-Moment Response — Safety Design

**This is the product's most important safety boundary, and it is deliberate.**

The "Moment" tab is a **keyword-to-fixed-response matcher.** It is not a chatbot, not a counsellor, and is never connected to a language model or any external service. The screen says so to the user in plain words.

- Crisis and overdose keyword patterns are evaluated **first**, ahead of every other branch, and return real dialable crisis lines rather than a coping suggestion.
- A region-aware crisis bar with live `tel:` and `sms:` links is present on Home, Urgent, Support, Moment, and inside red mode.
- No typing indicator, no simulated delay, nothing that performs a human presence that isn't there.

**Verified at commit `9644078`:** zero network calls of any kind in the application — no `fetch`, no `XMLHttpRequest`, no `WebSocket`. The only outbound URLs are four meeting-finder links the user taps deliberately. The "everything stays on device" claim holds in code, not just in copy.

---

## 7. Crisis Resources

**Primary market: Canada.** Additional territories are a data change, not a code change — crisis lines live in a region configuration object, and users in an unlisted country enter their own line, stored locally.

Currently shipping, each verified against the operator's own published source on 4 September 2026:

- **Canada (default):** 9-8-8 Suicide Crisis Helpline — call or text, 24/7, English and French. NORS (National Overdose Response Service) — 1-888-688-6677. Emergency: 911.
- **United States:** 988 Suicide & Crisis Lifeline. SAMHSA National Helpline — 1-800-662-4357. Emergency: 911.

**Standing rule: no number enters a crisis path without verification against the operator's own site.** A wrong number here is the most serious defect the product can ship.

### 7.1 Offline by default

**RIA works with no connectivity.** This is not a resilience feature bolted on; it falls out of the architecture. Because the app makes no network calls, there is nothing to degrade when the connection goes.

A service worker precaches the entire app shell on first visit, cache-first, with each asset cached independently so one failure cannot leave a user with no offline copy, and a navigation fallback so a refresh or deep link still opens the app.

What that means in practice, in three tiers:

| Conditions | What works |
|---|---|
| **No data connection at all** | Every screen: crisis numbers displayed, drift banner, red mode, all tools, breathing, delay timer, check-in, pattern history, photos, backup export |
| **Cellular voice/SMS only** — data down, throttled, or out of quota | All of the above, **plus the crisis path itself.** `tel:` and `sms:` handoff needs a phone network, not an internet connection |
| **Internet available** | The four external meeting-finder links, the only part of RIA that requires it |

This matters more than it would in most products. The users RIA is built for are disproportionately likely to be somewhere with no signal, on a suspended or prepaid plan, out of data, or on a phone that has been off — and the moment the app exists for is not a moment anyone can spend troubleshooting a connection. An app that needs a server to open is an app that fails exactly when it is needed. Even in total signal loss, the crisis numbers remain on screen to be read and dialled from any other phone.

*Precision, so it is not mistaken for a contradiction:* the service worker contains a `fetch` call for same-origin asset retrieval. The application itself contains none — no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no beacon — and the test suite asserts this on every run. Nothing in either path contacts a third party.

*Requires one prior online visit* to install the worker. **Unverified:** iOS storage eviction under pressure. Home Screen web apps are more durable than tab-based sites, but this is on the device-pass list rather than claimed.

---

## 8. Why Silence Detection Was Rejected

An earlier draft specified automated silence detection: if the user goes unresponsive, notify a primary contact and optionally share location. It is not deferred. It is out of scope, on principle and on evidence.

**On principle.** Absence cannot be detected on a device by that device — absence is only visible from outside. Any automated silence escalation therefore requires something beyond the user's phone to observe them and act. That is a monitored service, and RIA is not one.

**On evidence, three failures make it the wrong feature even setting the principle aside:**

| Problem | Consequence |
|---|---|
| Silence is a poor proxy for relapse | A dead battery, a flight, a double shift, a funeral, or simply not opening the app all read identically. In a population with legitimate quiet stretches, most alerts would be false. |
| False alerts spend the support network | Each wrong alarm costs contact credibility and user trust. A few, and the user removes the contact or the app — degrading the very network the feature exists to activate. |
| The tail risk is not embarrassment | Contact can't reach them → welfare check → police at the door of someone who may be using. Location sharing converts a worried phone call into a dispatchable address. For RIA's intended population, that outcome ranges from involuntary disclosure to lethal. |

A fourth objection is structural: the contact never consented. Automated notification conscripts someone into a first-responder role they were never asked to accept. The §4.3 human layer inverts this — the ask is explicit, made in calm, and refusable.

**The remaining architectural question is smaller and unresolved: reminders.** A self-directed nudge — *"you haven't checked in for two days"* — is squarely inside the governing rule; it observes the user for the user, and nothing leaves the device. But a PWA cannot deliver it. Web push on iOS requires Home Screen installation and a remote push server; there is no local scheduling API in Safari. A notification can therefore only fire while RIA is already open, which is precisely when the user does not need it.

A native build is the only path that delivers a reliable self-directed reminder without introducing a server. It is the graduation step, not a rebuild: the PWA remains the validation vehicle, reachable by URL without anyone being seen downloading a recovery app, and native follows once real usage justifies two codebases and app-store review.

## 9. Reward Design

**Addiction hijacks the reward loop. RIA's job in the danger moment is a faster, cleaner hit of meaning than the substance promises** — pulling reward from progress and connection instead of from the pattern.

**Shipped — the positive dopamine bank**, user-loaded and surfaced in the moment: personal photos of family, friends, kids, pets, meaningful places; favourite music, clips and content; personal affirmations in the user's own words; quick-access contacts; a running money-saved tally; the written record of what life looks like clean.

**Deliberately rejected: XP points, streak scoring, and "urges stopped" counters.** Two reasons, and they are design positions rather than deferrals:

1. Scoring crisis events creates an incentive to self-report them.
2. Streaks punish the relapse the product is specifically built to make survivable. A broken streak, at the exact moment a person is most fragile, is a shaming mechanic.

The money-saved tally is retained because it is real, verifiable, and creates no perverse incentive.

---

## 10. Reality Panel

**Status: shipped.** Always accessible: the affirmation carousel, the user's own photos, *what I lose when I relapse*, and *what my life looks like clean*. Content rotates to resist desensitisation.

---

## 11. Daily Check-In

**Status: shipped and persisted.** Short and fast: urges today, actions taken, contact made, and a closing question seeded from the user's own stated triggers. Missed check-ins increase the drift score.

---

## 12. Post-Relapse Module

**Status: shipped. Non-shaming by design.**

Flow: *"You're back. That matters."* → guided reflection (when did the drift begin, what signals were missed — options drawn from the user's own stated warning signs) → pattern update.

Resetting the day count is an explicit user opt-in, never automatic. Each entry persists into a *what you've learned* history.

**Goal: turn relapse into data, not identity failure.**

---

## 13. Customization and Learning Layer

**Shipped:** tone selection and stored triggers personalize copy throughout — the drift banner, red mode, the check-in, and the re-entry flow all speak in the user's own words.

**Roadmap:** the adaptive layer — learning individual cycle timing and which interventions actually work for this person. Triggers, check-ins and relapse events now all persist, so the data substrate exists. The learning loop itself does not yet.

To be explicit about a term v1 left ambiguous: this means **on-device personalization from the user's own history.** It does not mean, and will never mean, a language model generating advice in the moment (§6).

---

## 14. Build Status Summary

| Area | Status |
|---|---|
| Onboarding and intake | Shipped |
| Cycle engine | Shipped |
| Drift detection | Shipped — heuristic first pass |
| Intervention L1–L3 | Shipped — graduated, not yet a formal ladder |
| Intervention L4 (human layer) | Specified — silence agreement drafted by app, sent by user |
| Crisis path and region config | Shipped, verified |
| Full offline operation | Shipped — service worker verified (§7.1) |
| Moment-of-choice tools | Shipped; user-defined if/then rules on roadmap |
| Reward / dopamine bank | Shipped |
| Reality panel | Shipped |
| Daily check-in | Shipped |
| Post-relapse module | Shipped |
| Personalization | Shipped; learning loop on roadmap |
| Predictive risk windows | Roadmap — requires longitudinal data |
| Automated silence detection | **Rejected on principle and evidence (§8)** |
| Passive data integration | Rejected — would require monitoring (§8) |
| User-visible check-in history | Shipped |
| On-device usage ledger | Shipped |
| Backup and restore | Shipped |
| De-identified research export | Deferred until a study and ethics approval exist (§15) |
| Self-directed reminders | Requires native build (§8) |

**Validation status.** Automated coverage is a 39-assertion end-to-end suite covering the full onboarding path, trigger persistence, crisis-keyword interception, check-in and re-entry persistence, region switching, day-count stability, and reload survival — all passing in headless Chromium.

**The known gap: RIA has not been validated on iOS Safari.** The three highest-risk untested surfaces are call and text handoff from an installed standalone PWA, date entry in settings, and crisis-bar tap targets. Because the crisis path is load-bearing, a real-device pass on iOS is the gating item before any further feature work.

---

## 15. Your Data

**Everything the user enters stays on their device.** Check-ins, relapse records, photos, and written statements are held in the browser's local storage on that phone. There is no account, no sync, and nothing is transmitted.

**The user can see their own history.** A pattern view shows every check-in they have logged — the answers in their own words, with urge intensity plotted over time and re-entry days marked on the same axis. Seeing intensity climb in the days before a marker is the product's central claim made visible rather than asserted.

**A usage ledger records counts, never content:** sessions, red-mode entries, timer starts and completions, tool openings, contact taps, crisis-bar taps, check-in and re-entry counts. It holds no text the user wrote. Crisis-bar taps are counted; their outcome is not, and could not be.

**Backup is the user's responsibility, and the product says so.** Because nothing is held on a server, clearing browser data or losing the phone loses the history permanently. RIA provides an explicit backup file the user creates and stores themselves, and a restore path for a new device. The file is unencrypted and contains everything; the product states this plainly rather than burying it.

**Research data is not collected.** No telemetry, no analytics, no aggregate reporting — those all require a server. If RIA is ever studied, the mechanism will be a de-identified export the user generates and shares deliberately, shown to them in full before it leaves the device, with a named recipient and ethics approval in place first. That export is intentionally not built yet: shipping a consent flow with nothing behind it would be a trust liability.

**How RIA will be evaluated.** Because there is no server, RIA produces no telemetry — no usage reporting, no retention curves, no funnel. This follows from the architecture rather than working around it, and the evaluation method follows from it too.

Each device keeps the usage ledger described above: counts and dates, no content. A participant who chooses to take part generates a de-identified export from it and shares that deliberately, having seen its full contents first. Evidence comes from a small consented cohort and structured interviews, not from instrumentation.

This is the appropriate method here, not merely the available one. Telemetry measures app engagement. The outcome that matters is whether a relapse was interrupted — which no event stream can observe, on any architecture. A participant who can describe what happened in the moment is a better instrument than a session count.

The limit, stated plainly: RIA will never produce population-level usage or outcome data. Any claim about its effect will rest on a named study with ethics approval, or on nothing.

---

## 16. Positioning

**Not:** a sobriety tracker. Not a meeting companion. Not a counsellor.

**But:** a system that interrupts relapse before it happens.

---

## 17. Final Principle

> Recovery does not fail in beliefs. It fails in moments.

RIA exists to take control of those moments.
