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

_None yet. As sub-phases ship, their review entries go below — most recent on top, older reviews below._

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
