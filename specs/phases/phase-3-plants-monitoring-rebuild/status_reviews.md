# Phase 3 — Implementation Reviews

**Last Updated:** 2026-04-25
**Status:** ⏳ Not Started — skeleton only; review entries are added as sub-phases complete and go through code review

This document mirrors the Phase 2D `status_reviews.md` pattern: it collects post-implementation reviews, defect findings, and their remediations. Each sub-phase that completes work gets one entry here with its scope, findings, and fixes.

The intent is that future authors can read this file and understand **what went wrong and how it was corrected** — it's the phase's institutional memory.

---

## How to add an entry

When a sub-phase completes, a code reviewer (or the author themselves via self-review) appends a section with this structure:

1. **Review title + date + status.**
2. **Summary table** — issues found / fixed / deferred, grouped by severity.
3. **Per-area tables** (database, backend, web, mobile, specs, deployment) listing each issue with file reference, severity, and fix narrative.
4. **Deferrals** — anything that couldn't be fixed now and where it goes next.
5. **Links to commits / PRs** that landed the fixes.

Phase 2D's `status_reviews.md` at `specs/phases/phase-2-d-monitoring/status_reviews.md` is the canonical reference for depth and format.

---

## Planned Review Passes

| Review | Trigger | Agent / Reviewer | Expected entry |
|--------|---------|------------------|----------------|
| M1-R foundation review | After sub-phases 3-R1…3-R5 ship | web-code-reviewer + mobile-code-reviewer | Token-pipeline correctness; PWA Lighthouse; ESLint coverage; visual-regression baselines; full-sweep verification (zero non-generated hex literals) |
| 3-2 schema review | After sub-phase 3-2 lands | database-engineer + backend-code-reviewer | Migration correctness + rollback; index selection; role-enum migration risk |
| 3-3 monitoring backend review | After sub-phase 3-3 ships | backend-code-reviewer | Redis connection pooling; Streams replay safety; projector idempotency; debouncer timer accuracy; eager-load correctness |
| 3-4 web monitoring review | After sub-phase 3-4 ships | web-code-reviewer | Supercluster recomputation cost; WS patch idempotency; virtualization re-keying; overlay toggle memo |
| 3-5 mobile monitoring review | After sub-phase 3-5 ships | mobile-code-reviewer | Apr 24 marker fixes preserved; `tracksViewChanges={false}` audit; cluster bitmap key stability; `useFocusEffect` coverage |
| 3-6/3-7 task typing review | After sub-phases 3-6 + 3-7 ship | backend-code-reviewer + mobile-code-reviewer + web-code-reviewer | `custom_fields` schema strictness; parent/child cycle detection; partial-complete idempotency |
| 3-9/3-10 pruning-requests review | After sub-phases 3-9 + 3-10 ship | backend-code-reviewer + security-review | State-machine exhaustiveness; ADR-032 rayon-scope guard tests; FCM payload size; photo upload chunking |
| 3-11 capacity review | After sub-phase 3-11 ships | backend-code-reviewer | Concurrency (SELECT FOR UPDATE); overbook semantics; suggested-week payload shape |
| 3-12 seeds review | After sub-phase 3-12 ships | backend-code-reviewer | Ledger invariant (balance = Σ transactions); audit of every write path |
| 3-13 CSV backfill review | After sub-phase 3-13 ships | backend-code-reviewer + database-engineer | Idempotency on `reference_code`; Drive rehosting failure modes; memory bounds on 5 008-row import |
| 3-14 load-test review | After k6 runs | devops-engineer + backend-code-reviewer | Findings + fixes; baseline captured for Phase 4 comparison |
| Pre-deploy review | Before M5 rollout | code-reviewer + security-review (full branch scan) | All open issues triaged; nothing silently skipped |

---

## Entries

---

## M1-R Redesign Foundation — Post-Implementation Review (2026-04-25) ✅

**Status:** 4 bugs found → fixed same session; 0 deferred
**Scope:** Sub-Phases 3-R1 → 3-R5: token pipeline, ESLint plugin, brand fonts, NB primitives (mobile), Web PWA shell, full redesign sweep (mobile + web)
**Method:** User manual review on device + visual inspection of code
**Branch:** `main` (iterative delivery, no PR workflow yet)

### Review Summary

| Category | Issues Found | Fixed | Deferred |
|----------|-------------|-------|----------|
| Mobile | 3 | 3 | 0 |
| Web | 0 | 0 | 0 |
| Specs | 1 (clarity) | 1 | 0 |
| **Total** | **4** | **4** | **0** |

### Issues

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| 1 | Medium | `fe/mobile/src/screens/auth/LoginScreen.tsx` | Login error shows both a bottom toast AND an inline Redux error box simultaneously — duplicate feedback | Removed `dispatch(setError(...))` calls + inline error `View`; all API errors now route to toast only; field-validation errors (identifierError/passwordError under inputs) unchanged |
| 2 | Medium | `fe/mobile/src/screens/auth/LoginScreen.tsx` + `fe/mobile/src/components/nb/NBToast.tsx` | Toast auto-dismissed after 4 s — user couldn't read the error message | Added `persistent?: boolean` to `NBToastOptions`; all login-failure toast calls pass `persistent: true` → `visibilityTime: Number.MAX_SAFE_INTEGER`; user must tap ✕ to dismiss |
| 3 | Medium | `fe/mobile/src/components/nb/NBModal.tsx` + 6 consumers | NBModal had no built-in content or footer padding — every caller duplicated the same spacing values in a wrapper `<View>`; `ChangePasswordModal` footer used `NBButton` (shadow, 2 px radius) while filter modals used flat `TouchableOpacity` (borderWidth only, minHeight 46) — visually inconsistent across all bottom-sheet modals | Added `noPadding?: boolean` prop; non-scrollable `content` gains `padding: md, paddingBottom: sm` by default; `footerWrap` gains `paddingHorizontal: md, paddingVertical: sm+2`; `SortModal` passes `noPadding` (edge-to-edge rows); `ProfileScreen` drops manual `aboutContent` wrapper; all three filter modals drop redundant padding from `actionButtons`; `ChangePasswordModal` footer migrated from `NBButton` to `TouchableOpacity` matching filter-modal style (borderWidth, minHeight 46, `ActivityIndicator` for loading) |
| 4 | Low | `specs/phases/phase-3-plants-monitoring-rebuild/STATUS.md` | "Already clean from Phase 2 + 3-R2" for web 3-R5 sweep read like a skip; user couldn't see what web actually got in M1-R | Expanded row to explicitly list 3-R1/3-R2/3-R4 web deliverables and frame 3-R5 as a verification pass |

### Deferred

_None._

---

## M1-R Manual Review Checklist

> Work through this checklist on a physical Android device or emulator + a desktop browser before starting 3-2.
> Tick each item when confirmed OK; raise any failure as a bug.

### A. Token Pipeline (3-R1 / 3-R2)

```bash
# Run from project root
npm run tokens:build && git diff --exit-code   # must be clean
npm run tokens:verify                           # must exit 0
npm run test:tokens                             # all tests green
```

- [ ] `fe/web/src/app/generated/tokens.css` — present, starts with `/* generated`, has `:root { --color-nb-primary`
- [ ] `fe/mobile/src/constants/generated/tokens.ts` — present, starts with `/* generated`, exports `generatedTokens`

### B. ESLint — Zero Violations

```bash
cd fe/web   && npx eslint src/ --max-warnings=0   # no-inline-hex-colors, no-tailwind-shadow-classes-with-blur, prefer-nb-shadow-utility
cd fe/mobile && npx eslint src/ --max-warnings=0  # no-inline-hex-colors, rn-no-shadow-radius
```

- [ ] Both exit 0 — only allowlisted files in each config
- [ ] `scripts/hex-allowlist.txt` exists with 18+ entries, each has `| <reason>`

### C. Brand Fonts

**Mobile:**
- [ ] LoginScreen heading ("MASUK" / "SEKAR") renders in Space Grotesk Bold (not system font)
- [ ] Body text renders in Inter

**Web:**
- [ ] DevTools → heading → Computed → font-family shows "Space Grotesk"
- [ ] Body text shows "Inter"

### D. NB Primitives (3-R3 Mobile)

**NBToast (after Bug 1 + 2 fix):**
- [ ] Login with wrong credentials → single toast at bottom only (no inline red box below password field)
- [ ] Toast does NOT auto-dismiss — stays until user taps ✕
- [ ] Tapping ✕ closes the toast
- [ ] Field errors ("Username harus diisi" etc.) still appear under the relevant input

**NBModal — "Tentang Aplikasi" + all bottom-sheet modals (after Bug 3 fix):**
- [ ] Profile → "Tentang Aplikasi" → content has visible breathing room (no manual wrapper needed)
- [ ] Title "TENTANG SEKAR" visible (uppercase) at top; drag down closes sheet
- [ ] Filter modals (Aktivitas / Lembur / Tugas) — Reset and Terapkan buttons look identical to Batal / Ubah Password buttons in Ubah Password modal
- [ ] Sort modal (Urutkan) — option rows extend edge-to-edge (no content padding)

**NBText:**
- [ ] `variant="h1"` renders bold, larger than body text
- [ ] `variant="body-sm" color="gray500"` renders muted gray

### E. Web PWA Shell (3-R4)

- [ ] `fe/web/public/manifest.webmanifest` exists, valid JSON
- [ ] DevTools → Application → Manifest → shows SEKAR name, icons, theme color
- [ ] `NEXT_PUBLIC_FEATURE_PWA=false` in `.env.local` → no SW in DevTools → Service Workers
- [ ] `NEXT_PUBLIC_FEATURE_PWA=true`, restart dev → SW registered; disconnect network → offline shell loads
- [ ] Chrome Android: install banner appears → "Pasang" triggers browser install prompt
- [ ] `/icon` and `/apple-icon` routes render icons

### F. Responsive Scaffolding (3-R4)

- [ ] 375 px — single-column, no horizontal overflow
- [ ] 768 px — tablet breakpoint graceful
- [ ] 1280 px — desktop sidebar layout

### G. Full Redesign Sweep (3-R5)

**Mobile — key tokens:**
- [ ] ClockIn/ClockOut/ActivitySubmission/TaskCreate/OvertimeSubmit — error summary background is pinkish (`withAlpha(danger, 0.05–0.06)`), not `#FFF5F5`
- [ ] StaffingSummarySection — progress bar amber is `#E3A018` (nbColors.warning), not `#D97706`
- [ ] BoundaryOverlay — area center marker is amber; rayon dot is blue `#2563EB` (expected, allowlisted)
- [ ] LocationTrail — purple trail `#9333EA` (expected, allowlisted)

**Web — tokens already applied from Phase 2 + 3-R2:**
- [ ] Login page — NB card styling, Space Grotesk heading
- [ ] Dashboard sidebar — token colors
- [ ] Monitoring pages — load without errors; status colors render correctly from `monitoring.ts`

### H. Shadow Discipline

- [ ] Mobile cards/buttons show hard-edge shadow (offset, no blur)
- [ ] Web cards — `box-shadow: 6px 6px 0 #1C1917` (or similar hard-edge value) in DevTools
- [ ] No Tailwind `shadow-sm/md/lg` on web (ESLint enforces)

### I. CI Gates (simulate locally)

- [ ] Edit hex in non-allowlisted file → `npm run tokens:verify` exits non-zero
- [ ] Add `className="shadow-md"` to web component → `cd fe/web && npx eslint src/<file>` reports error
- [ ] Both gates pass on clean branch

<!--
Template (copy and fill when a sub-phase completes):

## Sub-Phase 3-X — Review (YYYY-MM-DD) ✅

**Status:** Complete — N of M issues fixed, K deferred
**Scope:** Brief description of what was reviewed
**Method:** Reviewers + tools
**Branch:** `f/phase-3-sub-X-name`

### Review Summary

| Category | Issues Found | Fixed | Deferred |
|----------|-------------|-------|----------|
| Database & Entity | 0 | 0 | 0 |
| Backend | 0 | 0 | 0 |
| Web | 0 | 0 | 0 |
| Mobile | 0 | 0 | 0 |
| Specs | 0 | 0 | 0 |
| **Total** | **0** | **0** | **0** |

### Issues

| # | Severity | File | Issue | Fix |
|---|----------|------|-------|-----|
| — | — | — | — | — |

### Deferred

| # | Reason | Tracked in |
|---|--------|-----------|
| — | — | — |

### Related Commits / PRs

- PR #__ — Title
-->
