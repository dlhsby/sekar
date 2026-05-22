# File structure consolidation

_Started 2026-05-22 01:32 UTC_

---

## User

Why is there two file hifi-mobile and hifi-mobile-app? merge and review it. 

Also i want you to make sure that the hifi implementation of the mobile and web is aligned with the design system

## Assistant

_[tool: list_files]_

_[tool: local_ls]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: local_ls]_

_[tool: local_grep]_

_[tool: local_ls]_

_[tool: local_ls]_

_[tool: local_read]_

_[tool: update_todos]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: grep]_

I found a major issue beyond the duplicate files — the hi-fi files are using **yellow primary (#F4D03F)** but your design system + codebase use **green primary (#7FBC8C)**. Let me audit the rest, fix the tokens, and merge.

_[tool: read_file]_

_[tool: str_replace_edit]_

Audit clear. Both `.html` files in the hi-fi pair were forked from the same starter but ended up with **yellow primary (#F4D03F) when the codebase + design-system use green (#7FBC8C)**. I'll align tokens via `hifi-shared.css` (which both mobile-app + web link), then merge the two mobile files into one.

**Step 1**: Fix tokens in `hifi-shared.css` to mirror `design-system.html` + `fe/mobile/src/constants/generated/tokens.ts`.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: run_script]_

**Step 2**: Build the merged `hifi-mobile.html` by stitching entry-flow sections (carousel/login/onboarding) and in-app sections (home/absensi/etc.) into one document, dropping the inline duplicate tokens in favor of the shared CSS.

_[tool: delete_file]_

_[tool: str_replace_edit]_

**Step 3**: Delete the duplicate file and update `index.html`.**Step 4**: Fix the leftover yellow `accent-color` refs and other hard-coded yellow references in `hifi-web.html`.

_[tool: grep]_

_[tool: run_script]_

_[tool: update_todos]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. Summary of what I found and fixed:

**Why there were two files** — `hifi-mobile.html` covered pre-login (carousel/login/onboarding, 14 screens) and `hifi-mobile-app.html` covered post-login (home/absensi/monitoring/tugas/aktivitas/lembur/perantingan/profile/notifikasi, 26 screens). They were split during incremental delivery but should always have been one document; navigation between them was broken anyway (each linked back to the other).

**Bigger problem found while merging** — token drift. The hi-fi files were using `#F4D03F` yellow as primary, but `design-system.html`, `fe/mobile/src/constants/generated/tokens.ts`, and your `nbTokens` runtime all use `#7FBC8C` sage green. Yellow is supposed to be the brand *accent* (pinwheel center, tab-active surface), not the primary action color. Web checkboxes were also hard-coded to yellow `accent-color`.

**Changes**
- `hifi-shared.css` — tokens rebuilt to mirror the design system exactly: green primary, DS stone neutrals (`#1C1917` black, `#F5F0EB` canvas), DS status palette (`success/warning/danger/info`), and a new **5-status monitoring palette** (`--status-active/idle/outside/missing/offline`) matching `tokens.ts`. Pin classes now have semantic aliases (`.pin.outside` = purple, etc.) per ADR.
- `hifi-mobile.html` — single merged file, 40 screens, 12 sections, links shared CSS instead of inlining duplicate tokens. Carousel-specific styles (scene/dots/bars/perm-row/banner/dotpulse) kept inline. Fixed monitoring legend + "outside area" pins to use the correct purple status color instead of red.
- `hifi-mobile-app.html` — deleted.
- `hifi-web.html` — 6× `accent-color:#F4D03F` → green, all `#1A1815` legacy black → `#1C1917`, `#F6F4EF` paper → `#F5F0EB`.
- `index.html` — masthead copy updated, second card removed, single entry now reads "40 screens · 12 sections".

Verifier is running in the background. If you want me to also align `wf-styles.css` (the wireframes have their own token set worth checking), say the word.

## User

Verifier agent check completed

## Assistant

_[tool: run_script]_

Quick fix — the verifier caught my arithmetic. Recounting screens: 5+6+3+3+3+3+3+2+3+4+3+1 = **39**, not 40.Fixed. Both files now read "39 screens · 12 sections" — matches the 39 bezels the verifier counted.

