# apps/mobile — Claude Code Guide

**Last Updated:** April 25, 2026
**Stack:** React Native 0.83.x, React 19.2.x, Redux Toolkit, FCM, Neo Brutalism 2.0 (WCAG 2.1 AA)
**Design language:** Neo Brutalism 2.0 — see [`specs/ui-ux/design-tokens.md`](../../specs/ui-ux/design-tokens.md) (canonical) and [`specs/mobile/component-library.md`](../../specs/mobile/component-library.md).

---

## ⚠️ Tokens are generated — never hand-edit

From Phase 3 M1-R sub-phase **3-R2** onward (planned, not yet executed):

- **Source of truth:** [`specs/ui-ux/tokens.json`](../../specs/ui-ux/tokens.json)
- **Generated consumer:** `apps/mobile/src/constants/generated/tokens.ts` (emitted by `scripts/build-tokens.ts`; **CI validates drift on every PR via `tokens-verify`**)
- **Re-export wrapper:** `apps/mobile/src/constants/nbTokens.ts` becomes `export * from './generated/tokens'` plus platform helpers (`useNBPress`, `pressStyle`)

**To change a token:** edit `tokens.json` → `npm run tokens:build` → commit the regenerated TS. **Never edit `nbTokens.ts` or any inline hex literal in component files.** ESLint rule `no-inline-hex-colors` (added in 3-R1) blocks PRs with raw hex.

---

## Canonical Type Scale (Phase 3 M1-R)

Mobile catches up to web canonical in 3-R2. Use `<NBText variant="...">` from `apps/mobile/src/components/nb/NBText.tsx` (new in 3-R3); never set `fontSize`/`fontWeight`/`lineHeight` literals.

| Variant | Family | Weight | Size / line-height |
|---------|--------|--------|--------------------|
| `display-xl` | Space Grotesk | 800 | 56 / 1.0 |
| `display` | Space Grotesk | 700 | 40 / 1.05 |
| `h1` | Space Grotesk | 700 | **28 / 1.2** (was 30 / 1.2 — drift fixed in 3-R2) |
| `h2` | Space Grotesk | 600 | **22 / 1.3** (was 24 / 1.3 — drift fixed) |
| `h3` | Space Grotesk | 600 | **18 / 1.35** (was 20 / 1.35 — drift fixed) |
| `body-lg` | Inter | 500 | 18 / 1.55 |
| `body` | Inter | 400 | 16 / 1.5 |
| `body-sm` | Inter | 400 | 14 / 1.45 |
| `caption` | Inter | 500 | 12 / 1.4 |
| `mono-sm` | JetBrains Mono | 500 | 12 / 1.4 |

---

## NB Primitives (`apps/mobile/src/components/nb/`)

Existing (Phase 2): `NBButton`, `NBCard`, `NBBadge`, `NBTextInput`, `NBPasswordInput`, `NBCardTextInput`, `NBSelect`, `NBDatePicker`, `NBSkeleton`, `NBTab`, `NBAlert`, `NBEmptyState`, `NBBackgroundPattern`.

**New in Phase 3 M1-R sub-phase 3-R3:**
- **`NBModal`** — wraps `@gorhom/bottom-sheet` for sheet variants (≤50 % viewport) and RN `<Modal>` for fullscreen. See [neo-brutalism-modal-guidelines.md](../../specs/mobile/neo-brutalism-modal-guidelines.md).
- **`NBToast`** — wraps `react-native-toast-message` with NB chrome (uppercase, hard-edge shadow, Lucide icon pair, bottom position).
- **`NBText`** — semantic typography component with the variants above.

Full prop reference: [`specs/mobile/component-library.md`](../../specs/mobile/component-library.md).

---

## Brand Fonts

`apps/mobile/assets/fonts/` (added in 3-R2): `.ttf` files for Space Grotesk (500/600/700/800), Inter (400/500/600/700), JetBrains Mono (400/500/600). All SIL OFL licensed. Linked at build via `react-native.config.js` `assets` array — re-run `npx react-native-asset` after adding files.

---

## Internationalization (i18n) — MANDATORY when touching the UI

The app is bilingual: **Indonesian (`id`, default) + English (`en`)** via `react-i18next`. **Whenever you add or change a user-facing string, localize it** — never hardcode display text.

- `NBText` children, `label`/`placeholder`, `NBToast.show({title,body})`, `Alert.alert(...)`, `accessibilityLabel`, inline validation, empty states → `t('<ns>:<key>')`.
- Add the key to BOTH `src/i18n/locales/{id,en}/<ns>.json` (id = Indonesian verbatim, en = English), identical key sets. Reuse `common`/`status`/`roles`/`errors`. Status labels come from `utils/statusHelpers.ts` (don't reinvent).
- Components: `const { t } = useTranslation()`. Hooks/services (non-component): `import i18n from '<...>/i18n/config'` then `i18n.t(...)`. Language preference lives in the `preferences` Redux slice + `AsyncStorage`, synced to the profile (`preferred_language`).
- New namespace → register in `src/i18n/resources.ts` **and** the web mirror (parity guardrail requires the same set). Verify: `npm run i18n:check` (repo root) + `npx tsc --noEmit`. Menu/nav labels are stored as i18n keys resolved at render (see `constants/menuConfigs.ts`). See root `CLAUDE.md` §Internationalization.

## Cross-Platform Parity

The native app, mobile web (<768 px), and desktop web all consume the same generated tokens. Differences are intentional Layer-3 patterns (bottom tabs vs. ☰ drawer vs. sidebar; bottom sheet vs. centered dialog; full-screen form vs. dialog). Never let token values diverge — that's drift.

See [`specs/ui-ux/design-tokens.md §Component Parity Matrix`](../../specs/ui-ux/design-tokens.md) for the parity table.

---
