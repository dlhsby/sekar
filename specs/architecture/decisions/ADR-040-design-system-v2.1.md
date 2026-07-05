# ADR-040: Design System v2.1 — sage-primary token re-baseline + pinwheel brand identity

## Status

Accepted (Phase 4 M1, 2026-05-23 — `tokens.json` `_meta.version` bumped to 2.1.0; web + mobile generated files regenerated; verified by `npm run tokens:verify`).

## Date

2026-05-22 (proposed) · 2026-05-23 (accepted)

## Context

ADR-036 locked `specs/ui-ux/tokens.json` as the single source of truth and shipped a generator pipeline in Phase 3 M1-R. The first generator run (Apr 25, 2026) used the v2.0 palette: yellow `#FDFD96` as `--primary`, mixed canvas colours (yellow + off-white + warm stone), and partially hard-edge shadows. The brand identity was wordmark-only — there was no logo mark.

In May 2026 the project owner iterated a complete brand + UI revisit on Claude Design (`claude.ai/design`). The 224 KB handoff bundle is now vendored at `design/`. The bundle contains:

- A locked **Design System v2.1** (`design/project/design-system.html`, `design/project/hifi-shared.css`).
- Full mobile hi-fi covering 39 screens (`design/project/hifi-mobile.html`).
- Full web hi-fi covering 11 frames over 13 routes (`design/project/hifi-web.html`).
- A complete **brand identity package** (`design/project/illustrations.html`): pinwheel mark, app icon, splash variants, 6 empty-state illustrations, 3 onboarding scenes, 29 brand icons, 5 brand patterns, full map-marker matrix.
- 4 chat transcripts (`design/chats/`) where intent lives.

Headline changes that v2.1 introduces relative to v2.0:

- **Primary** moves from yellow `#FDFD96` to **sage green `#7FBC8C`**. Yellow demoted to accent (pinwheel center, tab-active highlight, masthead tint).
- **Canvas** moves to **warm stone `#F5F0EB`** uniformly across mobile + web, replacing the mixed yellow / off-white / warm-stone drift.
- **Shadows** become **zero-blur hard-edge offset** at a codified 5-step scale (`--sh-xs` `2 2 0` → `--sh-xl` `10 10 0`). v2.0 still had soft-blur on some primitives.
- **Status palette** codified at 5 monitoring states (`active` / `idle` / `outside` / `missing` / `offline`) with paired -fg / -bg tokens. v2.0 had ad-hoc per-component colours.
- **Role accents** codified for 9 roles including `staff_kecamatan` (added in Phase 3 ADR-033). v2.0 had only loose colour conventions.
- **Brand mark** introduced — **pinwheel with 8 petals** (= 8 rayons) radiating from a yellow center (= DLH Surabaya).

Leaving the codebase on v2.0 means shipping a public release with a stale palette and no brand mark; the design system docs would also continue to disagree with the rendered hi-fi screens.

## Decision

**Adopt Design System v2.1 as the canonical palette for `specs/ui-ux/tokens.json`.** The pinwheel pinwheel mark is the **primary brand asset**; the wordmark becomes secondary.

ADR-036's generator architecture is **retained unchanged** — same three-layer model, same `scripts/build-tokens.ts` pipeline, same generated outputs. Only the *values* change. This means v2.1 ships as a JSON edit + a generator run; no toolchain changes.

Specifically:

1. Regenerate `specs/ui-ux/tokens.json` from `design/project/hifi-shared.css` lines 7-82 (token block). Manual port — the generator does not consume CSS.
2. Run `npm run tokens:build` from repo root. Commit regenerated `apps/web/src/app/generated/tokens.css` + `apps/mobile/src/constants/generated/tokens.ts`.
3. Ship pinwheel SVG to both platforms as the primary brand asset; replace iOS AppIcon + Android adaptive icon; replace mobile splash; update web PWA manifest.
4. Ship the 6 empty-state illustrations + 3 onboarding scenes from `illustrations.html`.
5. Update `specs/ui-ux/design-tokens.md` with the v2.1 diff and a "v2.0 → v2.1 migration" appendix.
6. Run `eslint-plugin-sekar-design` repo-wide; fix every literal-value violation surfaced by the colour shift.

Rebrand cutover requires an **app-store re-submission** (icon + splash changed). Plan a 2-week store-review buffer per the cutover checklist (`specs/phases/phase-4-production-readiness/status_deployment_checklist.md § 0 B`).

## Consequences

### Positive

- **Brand identity exists.** SEKAR now has a real mark (pinwheel) that ties to the org structure (8 rayons = 8 petals) and the parent agency (DLH Surabaya yellow center).
- **Visual coherence restored.** Sage primary + warm stone canvas survive outdoor sunlight legibility tests that yellow primary failed.
- **Hard-edge shadows everywhere.** Eliminates the lingering soft-blur drift that diluted the NB language.
- **Status colours codified.** Monitoring map pins / status pills / KPI cards stop drifting between `BoundaryOverlay`, `AreaStatusOverlay`, `MonitoringStatusSheet`.
- **Role accents codified.** 9 roles get unambiguous colour identity (including `staff_kecamatan`).
- **Zero new dependencies.** Generator pipeline is unchanged.
- **Existing screens repaint automatically** wherever they consumed generated tokens. Layout-level revamp happens screen-by-screen in Sub-Phase 4-R against the hi-fi.

### Negative

- **App-store re-submission required.** Adds a 2-week buffer to the release schedule.
- **Visual regressions possible.** Every screen needs a story-driven snapshot diff (Sub-Phase 4-0 A5). Some screens may have implicit colour assumptions that break.
- **ESLint sweep noisy.** Expect 50-150 violations from literal hex / borderWidth / shadow values introduced since the M1-R sweep landed.
- **Documentation churn.** `specs/ui-ux/design-tokens.md` rewrite + `CLAUDE.md` updates.
- **Marketing materials need refresh.** Old screenshots / promo graphics carry the yellow primary; need re-shoot or re-render.

### Neutral

- **ADR-036 is not deprecated.** Its architectural decision (generator pipeline, three-layer model, JSON-as-source) stands. Only the palette values change. ADR-036 § "palette" sub-decision is effectively superseded by this ADR, but the parent decision and its rationale remain in force.

## Implementation

Execution lives in Phase 4 Sub-Phase 4-0 (token re-baseline) and Sub-Phase 4-R (screen-by-screen revamp). See [`specs/phases/phase-4-production-readiness/README.md § 4-0`](../../phases/phase-4-production-readiness/README.md#4-0--design-bundle-adoption--token-re-baseline-3-4-days) and [`ui-ux.md § 1`](../../phases/phase-4-production-readiness/ui-ux.md#1-design-system-v21--token-diff-vs-v20) for the detailed token diff and brand asset inventory.

## References

- `design/project/design-system.html` — full v2.1 token + component documentation
- `design/project/hifi-shared.css` — canonical CSS-variable export of v2.1 tokens (the regeneration source)
- `design/project/illustrations.html` — brand identity package
- `design/chats/chat1.md` — design intent (2247 lines)
- ADR-036 — parent decision (pipeline + three-layer model retained)
- ADR-037 — Web PWA (consumes v2.1 manifest theme)
- ADR-009, ADR-033 — role definitions consumed by role-accent palette
