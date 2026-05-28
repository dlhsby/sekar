# Next-session prompt — SEKAR mobile revamp · TARGET: PRF (Profile) + Brand assets

> Paste the fenced block below into a fresh session.
> Self-contained; no plan mode — implement directly checkpoint by checkpoint.
> Tests come AFTER the user acknowledges each implementation. User runs Metro watch
> and tsc manually and will share any errors before tests are written.

```
We're continuing the SEKAR MOBILE app — Phase 4, Milestone 3 (UI/UX revamp to Design
System v2.1). MOBILE ONLY this iteration (ignore the web app).

## Working agreement — READ THIS FIRST

**Code-first, then tests.** After each checkpoint:
1. Implement the code changes.
2. Report what changed + what to verify (Metro reload vs. native rebuild).
3. STOP. Wait for the user to acknowledge the result or share any errors from their
   Metro / tsc watch. Do NOT write tests yet.
4. Only when the user says "tests" or "looks good" (or equivalent): write the full
   test suite for that checkpoint with MAXIMUM coverage (see test rules below).

**User runs the watch manually.** Do not spawn long-running jest/tsc commands —
the user will paste errors back here. You may run quick one-shot checks like
`npx tsc --noEmit` or `npx jest --testPathPatterns="<suite>" --no-coverage` to
verify before reporting.

**Test rules (when writing tests):**
- Maximum coverage: every branch, every state variant, every prop combination that
  has visible/behavioral effect.
- When test files already exist and have a Babel SyntaxError on a TypeScript
  annotation (e.g. `(overrides: any = {})` at top-level), fix the annotation
  (use `(overrides = {})` or `// @ts-ignore`) — this is a known jest/babel quirk
  in this repo, not a code bug.
- Mock all NB primitives, navigation, Redux store, and heavy native deps (e.g.
  `react-native-encrypted-storage`, vector icons, `@gorhom/bottom-sheet`) so tests
  are fast and isolated.
- Use `Provider` + `configureStore` with `preloadedState` for Redux-connected tests —
  mirror the pattern in existing passing suites (e.g. `OvertimeListScreen.test.tsx`).

## Where things stand

Read these files FIRST and trust them over re-exploring the whole codebase:
- `specs/phases/phase-4-production-readiness/status_progress.md`  (most-recent-first changelog)
- `specs/phases/phase-4-production-readiness/ui-ux.md`            (brand §3 status; PRF rows)
- `specs/phases/phase-4-production-readiness/mobile.md`           (screen matrix; PRF rows §PRF-1/2/3; brand asset rows)

Key context already in place from prior sessions:
- `SekarPinwheel.tsx` + `SekarLogoBox.tsx` exist in `components/brand/`
- Splash, carousel (WL-1…WL-5), Login, Forgot/Change password, Onboarding (OB-1…OB-3)
  all done.
- `RoleAvatar` primitive done in `components/common/RoleAvatar.tsx`
- Android native splash done (BootTheme + bootsplash.xml); iOS shows wordmark only —
  no pinwheel in `Images.xcassets` yet (see Checkpoint 4).
- Design tokens v2.1 in `fe/mobile/src/constants/nbTokens.ts` (canonical).

## TARGET this iteration

### Checkpoint 1 — PRF-1: ProfileScreen revamp
**File:** `fe/mobile/src/screens/common/ProfileScreen.tsx` (252 lines currently)
**Hi-fi frame:** `design/project/hifi-mobile.html` PRF-1 section.

What to look for in the hi-fi:
- Large role-colored `RoleAvatar` (reuse existing `RoleAvatar.tsx`) as hero, not a
  plain icon circle.
- User info block: full name (`h2`), role label (`mono-sm uppercase`), area name
  (`body-sm gray600`).
- Stats row: shift count + activity count for the current month (derive from Redux
  `shift` / `activities` slices if available; fall back to "—" when no data).
- Action rows using `NBCard` + `MaterialCommunityIcons`: Edit Profil, Sinkronisasi
  Data, Notifikasi, Keluar.
- Token compliance: no inline hex, no `nbTypography.*`, no `nbBorders.base`.

**Reconciliation decisions to make before coding:**
- Confirm what's in Redux state for the profile (read `store/slices/authSlice.ts`
  for `auth.user` shape and `auth.assignedArea`).
- `ProfileScreen` uses `useNavigation` — check `types/navigation.types.ts` for the
  navigate-to-EditProfile + navigate-to-Notifications target names.
- Do NOT add new API calls — `auth.user` snapshot covers offline read-only.

**Verify:** Metro reload sufficient (pure JS).

---

### Checkpoint 2 — PRF-2: SettingsScreen + PRF-3: EditProfileScreen token pass
**Files:** `fe/mobile/src/screens/common/SettingsScreen.tsx` (403 lines),
           `fe/mobile/src/screens/common/EditProfileScreen.tsx`
**Action for PRF-2 (Revamp):** align to hi-fi PRF-2 — check for Phase 2 shims
(`nbTypography.*`, `nbBorderRadius.*`, `nbBorders.base`, `gray['xxx']`) and replace;
restructure section headers to `mono-sm uppercase` + `MaterialCommunityIcons` pattern
consistent with the rest of the revamped screens.
**Action for PRF-3 (Token-only):** same shim removal, no layout change.

**Verify:** Metro reload sufficient (pure JS).

---

### Checkpoint 3 — Brand: NBEmptyState illustration prop + 6 inline illustrations
**Files:** `fe/mobile/src/components/nb/NBEmptyState.tsx` (add `illustration?` prop),
           `fe/mobile/src/assets/empty/` (create 6 SVG placeholder files)

Currently `NBEmptyState` has no `illustration` prop — the spec (`ui-ux.md §3.4`)
requires 6 illustrations (`illo-reports`, `illo-shifts`, `illo-offline`,
`illo-location`, `illo-search`, `illo-personnel`) wired via `NBEmptyState`.

**Scope:**
- Add optional `illustration?: keyof typeof ILLUSTRATIONS | React.ReactNode` prop
  to `NBEmptyState`.
- Ship the 6 illustrations as **inline SVG React components** (not file assets)
  in `fe/mobile/src/components/nb/illustrations/`. Each is a minimal branded SVG
  (30–60 lines max) derived from `design/project/illustrations.html` — read the
  actual SVG source from the HTML file for each illo ID
  (`illo-reports`, `illo-shifts`, `illo-offline`, `illo-location`,
  `illo-search`, `illo-personnel`).
- Wire them: `NBEmptyState` renders the illustration above the icon when
  `illustration` is set, replacing the default `MaterialCommunityIcons` icon.
- Update the 3–4 screens that use `NBEmptyState` with the most relevant illo
  (e.g. `ShiftHistoryScreen` → `illo-shifts`, `OvertimeListScreen` → `illo-reports`,
  error/offline states → `illo-offline`).

**Verify:** Metro reload sufficient. Check each illustration renders at ~120px
height in the empty-state card.

---

### Checkpoint 4 — Brand: iOS LaunchScreen pinwheel
**File:** `fe/mobile/ios/sekar/LaunchScreen.storyboard`
          `fe/mobile/ios/sekar/Images.xcassets/`

Currently iOS shows wordmark only. The Android splash has the pinwheel VectorDrawable;
iOS is missing it. `SekarPinwheel` is a JSX component — we need a static vector.

**Scope:**
- Read `design/project/illustrations.html #sekar-pinwheel` (or `#sekar-mark`) for
  the SVG paths.
- Export as a PDF or SVG into
  `fe/mobile/ios/sekar/Images.xcassets/SekarPinwheel.imageset/` (1x/2x/3x PNGs, or
  vector PDF). Scaffold the `Contents.json` for the imageset.
- Update `LaunchScreen.storyboard` to show the pinwheel `UIImageView` centered above
  the "SEKAR" label (mirroring the Android bootsplash layout).

**Note:** this requires a **native rebuild** (`npm run ios` or Xcode build) to verify.
Say so explicitly when reporting.

---

### Checkpoint 5 — Brand: App icon (Android + iOS)
**Files:** `fe/mobile/android/app/src/main/res/mipmap-*/ic_launcher*`
           `fe/mobile/ios/sekar/Images.xcassets/AppIcon.appiconset/`

Currently both platforms show the React Native default icon.

**Scope:**
- Read `design/project/illustrations.html #app-icon` for the icon design
  (pinwheel centered on warm-stone `#F5F0EB` background, 2px black border, 10px
  offset shadow, rounded-square).
- Generate raster PNGs at the standard sizes for both platforms from the SVG source.
  If `sharp` or `svgexport` isn't available, scaffold `ic_launcher.svg` +
  `ic_launcher_foreground.xml` (adaptive) + `ic_launcher_background.xml` for Android;
  scaffold the `AppIcon.appiconset/Contents.json` + placeholder PNGs for iOS.
- The goal is: next `npm run android` / Xcode build shows the SEKAR pinwheel icon,
  not the default React Native icon.

**Note:** requires a **native rebuild** to verify on device.

---

## Guidance sources — use ALL THREE, reconcile with real implementation
- SPEC: `specs/phases/phase-4-production-readiness/ui-ux.md` + `mobile.md` +
  `specs/ui-ux/design-tokens.md`
- DESIGN: `design/project/hifi-mobile.html` (PRF frames) +
  `design/project/illustrations.html` (brand mark, empty-state illos, app icon)
- CURRENT CODE: read the named files before making changes; do not redo already-done work

## Useful pointers
- NB primitives barrel: `fe/mobile/src/components/nb/index.ts`
- NB tokens: `fe/mobile/src/constants/nbTokens.ts` (import tokens from here only)
- Auth slice shape: `fe/mobile/src/store/slices/authSlice.ts`
- Navigation types: `fe/mobile/src/types/navigation.types.ts`
- RoleAvatar: `fe/mobile/src/components/common/RoleAvatar.tsx`
- SekarPinwheel: `fe/mobile/src/components/brand/SekarPinwheel.tsx`
- Android bootsplash for reference: `fe/mobile/android/app/src/main/res/drawable/bootsplash.xml`
- NBText color values: flat keys only (e.g. `"gray500"`, not `"gray['500']"`)
- After each Checkpoint: append a dated entry to
  `specs/phases/phase-4-production-readiness/status_progress.md` and mark the
  relevant row in `mobile.md` done.
- Before `git add`: `find android ios -name CLAUDE.md -delete` (never stage CLAUDE.md)
- Conventional commit messages, no AI attribution line.

Start with Checkpoint 1. Read `ProfileScreen.tsx`, `authSlice.ts`,
`navigation.types.ts`, and the PRF-1 hi-fi frame before writing any code.
```
