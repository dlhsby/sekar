# Next-session prompt — SEKAR mobile revamp · TARGET: ABS (Absensi) + LBR (Lembur)

> Paste the fenced block below into a fresh session. Self-contained; plan mode.
> Target is pre-set to the clock-in/out absensi screens + overtime (lembur) screens.

```
We're continuing the SEKAR MOBILE app — Phase 4, Milestone 3 (UI/UX revamp to Design
System v2.1). MOBILE ONLY this iteration (ignore the web app). Work in PLAN MODE first:
produce a small, reviewable plan; do NOT implement yet.

## Where things stand
The mobile entry-flow + onboarding, Home (HOME-1/2/3), TUG (Tasks), and AKT (Aktivitas)
sweeps are DONE and committed on `main`. Read these FIRST and trust them over re-exploring:
- specs/phases/phase-4-production-readiness/status_progress.md  (most-recent-first changelog)
- specs/phases/phase-4-production-readiness/ui-ux.md            (entry-flow + HOME status + reconciliations)
- specs/phases/phase-4-production-readiness/mobile.md           (full screen matrix; ABS + LBR rows show current status)

NOTE: a prior token-sweep pass already removed Phase 2 token shims (nbTypography.*,
nbBorderRadius.*, nbBorders.base → widthBase, gray['xxx'] → flat) from many screens —
confirm via `git log` and by reading the files before planning. Do NOT redo work already done.
What is still needed is the FULL HI-FI LAYOUT REVAMP for these screens (like the entry-flow
treatment), reconciled to current implementation.

## TARGET this iteration: ABS + LBR

### ABS — Absensi (clock-in/out + shift history)
- ABS-1: Clock-in · GPS + selfie  →  fe/mobile/src/screens/field/ClockInOutScreen.tsx
- ABS-2: Clock-in · Di luar area  →  same screen (out-of-area state / warning variant)
- ABS-3: Shift history             →  fe/mobile/src/screens/field/ShiftHistoryScreen.tsx

### LBR — Lembur (overtime)
- LBR-1: Lembur list        →  fe/mobile/src/screens/overtime/OvertimeListScreen.tsx
- LBR-2: Ajukan lembur      →  fe/mobile/src/screens/overtime/OvertimeSubmitScreen.tsx
  (note: spec says OvertimeCreateScreen — confirm actual filename above)
- LBR-3: Detail lembur      →  fe/mobile/src/screens/overtime/OvertimeDetailScreen.tsx
- Supporting component      →  fe/mobile/src/screens/overtime/components/OvertimeCard.tsx

## Guidance sources — use ALL THREE, then reconcile with the real implementation:
- SPEC: specs/phases/phase-4-production-readiness/ui-ux.md + mobile.md +
  specs/ui-ux/design-tokens.md. These define intent, v2.1 tokens, and the screen matrix.
- DESIGN: design/project/hifi-mobile.html (ABS + LBR hi-fi frames) and
  design/project/hifi-shared.css (canonical token values).
  design/project/illustrations.html for brand art (empty states, etc.).
- RECONCILE all three against the CURRENT code:
  * Verify every hi-fi element against real data/props/services — do NOT build UI for data
    the app lacks. For ABS: confirm GPS validation flow, selfie capture, out-of-area state,
    shift Redux slice shape. For LBR: confirm overtimeSlice fields, list/detail API shape,
    submit form fields.
  * Retain/reconcile existing shared NB primitives (NBButton, NBCard, NBText, NBBadge,
    NBAlert, PhotoUploader, NBSelect, NBDatePicker, FieldHomeHeader, etc.) — do not
    restyle a shared primitive to match the mock; reconcile at the screen level.
  * Keep existing offline queue behaviour (ABS + LBR both work offline per the spec) —
    do not touch offline logic, only the visual layer.
  * Update existing files in place; reuse components already built; keep files small and
    focused. Extract a shared widget only if it's clearly reused across ABS and LBR screens.

## Working agreement (keep context lean + reviewable):
- SMALL iterations: ONE screen per checkpoint (e.g. ClockInOutScreen → ShiftHistoryScreen
  → OvertimeListScreen → OvertimeSubmitScreen → OvertimeDetailScreen + OvertimeCard).
  After each: run `npx tsc --noEmit` + ESLint on changed files + relevant jest suites
  (keep green), UPDATE specs (ui-ux.md + append a dated status_progress.md entry + mark
  the ABS/LBR row in mobile.md done), then PAUSE for my review and commit before the
  next unit. Do not batch many screens.
- Tokens only: import from fe/mobile/src/constants/nbTokens.ts; NO inline hex (ESLint
  rule `no-inline-hex-colors`); never hand-edit generated token files (edit
  specs/ui-ux/tokens.json → `npm run tokens:build` from project root).
- Tests are required for new/changed behavior. Before committing, run a blast-radius jest
  pass over the touched areas. If you change a shared slice/type, grep for existing tests
  that build that state and fix their fixtures.
- Conventional commit messages; NO AI attribution line.
- Gotcha: before `git add`, always run `find android ios -name CLAUDE.md -delete`; never
  stage a CLAUDE.md.
- Native changes (manifest/themes/drawables) need a full rebuild (`npm run android`); pure
  JS/TS changes only need a Metro reload — say which when reporting how to verify.

## Useful pointers (read only what's needed for ABS + LBR):
- NB primitives barrel: fe/mobile/src/components/nb/index.ts
- Home widgets (may have reusable pieces): fe/mobile/src/components/home/
- Navigation types: fe/mobile/src/types/navigation.types.ts
- Shift Redux slice: fe/mobile/src/store/slices/shiftSlice.ts
- Overtime Redux slice: fe/mobile/src/store/slices/overtimeSlice.ts (confirm exists)
- Offline queue: fe/mobile/src/services/sync/offlineQueue.ts
- NBText variants + token names: fe/mobile/src/constants/generated/tokens.ts (via nbTokens.ts)
  NBText.color only accepts flat nbColors keys (e.g. "gray500", not "gray['500']").

Start by reading the ABS + LBR rows in mobile.md and the matching hi-fi frames in
hifi-mobile.html, then read the current screen files listed above. Give me a
per-checkpoint breakdown: what changes per screen, which hi-fi elements have real backing
data vs. need adapting/omitting, files to touch (update-first, no new files unless
necessary), components to reuse/extract, and the test plan per checkpoint. Keep exploration
lean — prefer the named specs + the specific target files over re-reading the whole codebase.
```
