# ADR-036: Design Tokens — Single Source of Truth at `specs/ui-ux/tokens.json`

## Status

Accepted

## Date

2026-04-25

## Context

Through Phase 2 the SEKAR "Neo Brutalism" language lived in two hand-maintained files:

- `fe/web/src/app/globals.css` — `:root { --color-nb-*: ... }` variables, hard-coded shadows with `rgba()` blur.
- `fe/mobile/src/constants/nbTokens.ts` — literal hex codes in a TypeScript object, `shadowRadius: 1-4` with soft blur.

Visual drift accumulated:

- Mobile `primaryDark = '#5A9B6F'` vs web `--color-nb-primary-hover = '#6BA87A'` were meant to be the same color.
- Web button shadow `0 4px 6px rgba(0,0,0,0.1)` and mobile button shadow `{ shadowOffset: {0,4}, shadowRadius: 6, shadowOpacity: 0.1 }` both had blur, diluting the NB "hard-edge stamp" identity.
- Page background was `#FDFD96` (yellow) on some surfaces and `#FFFFFF` on others; neither matched the `#F5F0EB` warm-stone tone the design team had actually chosen.

A design-system pass by Claude Design (Apr 24–25, 2026) produced a full token registry that fixes all three sources of drift. Phase 3 is the right moment to lock this in: every Phase 3 surface is either green-field (plants, pruning requests, capacity, seeds) or a full rewrite (monitoring v2), so we pay the migration cost once and ship consistent.

Leaving the two hand-maintained files as-is and hoping new code "matches" has been tried for two phases and has demonstrably failed — drift increased, not decreased.

## Decision

**`specs/ui-ux/tokens.json` is the single source of truth** for every Layer 1 design token (colors, shadows, radii, type scale, motion timing, spacing, font stacks). `specs/ui-ux/tokens.schema.json` validates it; CI rejects structural violations.

Web and mobile consume **generated** files emitted by `scripts/build-tokens.ts`:

- `fe/web/src/app/generated/tokens.css` — `:root { --color-nb-*: … }` and utility-friendly custom properties.
- `fe/mobile/src/constants/generated/tokens.ts` — `export const nbTokens = { … }` object.

Both generated files are committed to git so reviewers see diffs; CI re-runs the generator on every PR and fails the build if the committed output drifts from what the generator produces.

The three-layer model:

- **Layer 1 (100% shared)** — byte-identical values. Colors, spacing scale, border widths/radii, shadow offsets, type scale, motion. Owned by `tokens.json`.
- **Layer 2 (platform-adapted primitives)** — same intent, different syntax. Shadow emitter, press animation, focus ring, hit target, safe area. Owned by the generator.
- **Layer 3 (intentional divergence)** — input-model-driven patterns that *should* differ. Nav (bottom tabs vs sidebar), data display (cards vs tables), modals (bottom sheets vs dialogs), menus, keyboard shortcuts, offline UX. Not parity targets.

Full registry and emitter rules: [specs/ui-ux/design-tokens.md](../../ui-ux/design-tokens.md).

## Consequences

### Positive

- **Single edit = both platforms updated.** Adding a new color means editing `tokens.json` once; the generator emits both files.
- **Drift impossible without CI failure.** Hand-edits to `generated/*` fail the `tokens:verify` gate.
- **Consistent NB visual identity.** All shadows become hard-edge (`radius: 0`) — the single biggest pattern that restores the NB stamp. The canvas background normalizes to `#F5F0EB` warm stone on both platforms.
- **Future theme variants (dark mode, high-contrast) are cheap.** They are JSON overlays on top of the base file.
- **Schema validation catches typos.** A contributor adding `"borderd": "#1C1917"` to `tokens.json` fails CI immediately.

### Negative

- **New toolchain to maintain.** `scripts/build-tokens.ts` is new code that must keep working across Node upgrades and platform changes. Mitigated by keeping it hand-rolled (~100 lines of TS, no Style Dictionary dependency — decision locked in M1-R sub-phase 3-R1).
- **One-time migration cost.** M1-R sub-phases 3-R1…3-R5 (14 dev-days total) cover the entire migration: pipeline + value migration + primitive sweep + PWA shell + full-app sweep across non-rewritten screens. **Promoted from prior Phase 4 backlog into Phase 3 M1-R 3-R5** so no screen lingers on old tokens after Phase 3.
- **Committing generated files adds PR noise.** Reviewers must learn to treat `generated/` diffs as secondary. Mitigated by clear file header comment and a CODEOWNERS rule requiring design-system owner review on `generated/*`.

## Alternatives Considered

- **Keep hand-maintained `globals.css` + `nbTokens.ts`.** Rejected — tried for two phases, drift accumulated not decreased.
- **Style Dictionary.** Attractive but adds a dependency and opinionated file layout for what is essentially a 100-line JSON → (CSS, TS) transform. Rejected to keep the toolchain minimal; could be adopted later if scope grows.
- **Adopt Tailwind's theme config as the source of truth on web and regenerate mobile from it.** Rejected — Tailwind config is a TS literal, not a structured data file; validation would be bespoke, and the "source of truth" would be coupled to one platform's build system.
- **Runtime fetch of a tokens endpoint.** Rejected — adds network dependency, breaks offline rendering, gains nothing since tokens change only at release time.

## References

- [design-tokens.md](../../ui-ux/design-tokens.md) — full registry, three-layer model, emitter rules, PWA, responsive breakpoints
- [tokens.json](../../ui-ux/tokens.json) — the source of truth
- [tokens.schema.json](../../ui-ux/tokens.schema.json) — CI validator
- [neo-brutalism.md](../../ui-ux/neo-brutalism.md) — design language reference
- [ADR-037](./ADR-037-web-pwa.md) — PWA adoption (consumes these tokens for manifest `theme_color` / `background_color`)
- Phase 3: [README](../../phases/phase-3-plants-monitoring-rebuild/README.md) · [ui-ux](../../phases/phase-3-plants-monitoring-rebuild/ui-ux.md) · [mobile](../../phases/phase-3-plants-monitoring-rebuild/mobile.md) · [web](../../phases/phase-3-plants-monitoring-rebuild/web.md)
