# Slice 3 — Mobile list sheet: node list, row hide, breadcrumb

**Spec:** [`../PARITY.md`](../PARITY.md) — gaps **M8** (Wilayah/Petugas list), **M4** (row hide),
**M7** (breadcrumb in the sheet).

**Format note.** Slice 1's plan was written in full bite-sized form because it was meant to survive
handoff to a context-free implementer. This one is executed inline by the author, so it records the
design and the task boundaries rather than transcribing every code block. The approval gate and the
TDD cycle are unchanged.

## The gap

`MonitoringStatusSheet` is one scrolling surface: status chips → attendance → on-leave → operations →
a role-grouped worker list. There is **no node list at all**, so an operator cannot browse or drill
areas from the sheet — only from the map. Web has had a Wilayah tab since the drill-down revamp.

## Design

**A tab, not a second sheet.** The sheet already owns the "what is here" question; adding a surface
beside it would split that answer in two. `NBTab` already exists and the search modal already uses it,
so the shape is established.

```
┌ Pengaturan ────────────── ⌄ ┐
│ ‹ Rayon Pusat               │   ← breadcrumb (M7), current level only
├─────────────────────────────┤
│  Wilayah 31  │  Petugas 14  │   ← NBTab (M8)
├─────────────────────────────┤
│ Kawasan Genteng Kali    › 👁 ⓘ │  ← node row: drill, hide, detail (M4)
│  0 Terjadwal  0 Hadir …      │
```

**Wilayah lists the children of where you are, one level down** — the same rule web settled on, for the
same reason: the map's job is to show, the list's job is to navigate. Tapping a row drills; the mode
survives the drill.

**Row hide is per-device and presentation-only.** Ported from web's `hidden.ts` with `AsyncStorage` in
place of `localStorage`, keeping its three rules: hiding never changes a count, it is always visible
that something is hidden with one tap back, and a hidden node hides its own row only — never its
children.

**Zero counts are muted**, as on web: most numbers on most rows are 0, and if every value is bold the
map's actual problems do not stand out. Muted to a tone that still clears WCAG AA — measured, not
guessed.

## Tasks

| # | Deliverable | Files |
|---|---|---|
| 1 | `hiddenEntities` — per-device hide list, pure core + hook | `utils/hiddenEntities.ts` + test |
| 2 | `MonitoringNodeRow` — one node row: name, roster chips, drill, hide, detail | `components/monitoring/MonitoringNodeRow.tsx` + test |
| 3 | `MonitoringNodeList` — the rows plus the restore banner | `components/monitoring/MonitoringNodeList.tsx` + test |
| 4 | Wilayah/Petugas tabs + breadcrumb wired into the sheet | `MonitoringStatusSheet.tsx`, `StatusAndDetailSheets.tsx`, `MapDashboardScreen.tsx` |
| 5 | i18n (both locales), `PARITY.md` rows, `CHANGELOG.md`, PR | specs + locales |

## Out of scope, deliberately

- **Bulk reassign and on-leave (M9/M10)** — slice 5, and both hang off this list.
- **Web gaining mobile's attendance / on-leave sections** — that is the reverse direction, slice 4.
- **Retuning the density constants** — still outstanding from slice 1 Task 8, still needs a device.
