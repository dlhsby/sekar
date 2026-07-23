# Mobile platform

React Native 0.83 / React 19 — 8-role navigation, offline-first, FCM, Neo Brutalism (WCAG 2.1 AA).
Setup: [`../../../apps/mobile/README.md`](../../../apps/mobile/README.md).

| Doc | What |
|-----|------|
| [`screens.md`](screens.md) | 30+ screens across roles + user flows (the catalogue) |
| [`navigation.md`](navigation.md) | React Navigation 7 tree, role entry points |
| [`state-management.md`](state-management.md) | Redux Toolkit + thunks, normalized state |
| [`offline-sync.md`](offline-sync.md) | AsyncStorage queue + sync logic |
| [`permissions.md`](permissions.md) | iOS/Android location, camera, notifications |
| [`component-library.md`](component-library.md) | RN primitives + Neo Brutalism components |
| [`design-tokens.md`](design-tokens.md) | Mobile token usage (SoT: [`../../design-system/`](../../design-system/README.md)) |
| [`dependency-updates.md`](dependency-updates.md) | Major lib versions + upgrade strategy |

Design rationale: [`neo-brutalism-modal-guidelines.md`](neo-brutalism-modal-guidelines.md) ·
[`color-palette-standardization.md`](color-palette-standardization.md) ·
[`background-color-rationale.md`](background-color-rationale.md). Capability → screen map:
[`../../features/`](../../features/README.md).

## Changelog
- 2026-07-23 — **"Jadwal Saya" was structurally broken; fixed with real detail.** `NBBackgroundPattern` is `flex: 1` and was rendered as a **childless sibling**, so it claimed half the screen — that is what pushed the date nav into the middle of the page and left the day's card colliding with the "Hari ini" chip. It now wraps the content, as its API intends. The card also showed "Area belum ditetapkan" for every kawasan/rayon/kota assignment (those name no lokasi by design); it now falls back to the scope label via `resolveScheduleScope`, adds `leave_permit` to the status pill map (it was missing — that status rendered as `undefined`), guards unknown statuses, and explains what each status *means* for the day (`schedules:mySchedule.statusHint.*`, id/en). **Date picker fixed:** the month column was empty because `t('components:nbDatePicker.months')` was called without `returnObjects: true`, so i18next returned a string and `Array.isArray` was false.
