# Plan 006: Use Append-Log Order For Project Freshness

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- apps/web/app/room/[roomId]/page.tsx src/rooms/project-state.ts src/cli/operations.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/004-serialize-web-replay-and-sequence-errors.md
- **Category**: bug
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Project file freshness currently depends on client-provided ISO timestamps. A collaborator with a skewed clock can make later append-log records look stale, or can cause conflict detection to choose the wrong winner. The append log already provides monotonic `seq`; use it for ordering, keeping timestamps only for display.

## Current State

- Web writes `updatedAt = new Date().toISOString()` in `page.tsx:873` and `898-906`.
- Web drops remote file snapshots as stale using `isStaleProjectFileSnapshot(projectFileUpdatedAtRef.current[path], parsed.updatedAt)` at `page.tsx:436-438`.
- CLI project replay mirrors timestamp staleness in `src/cli/operations.ts:1047-1050`.
- `src/rooms/project-state.ts:164-208` also uses `fileUpdatedAt` timestamps for snapshot replay.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `apps/web/app/room/[roomId]/page.tsx`
- `src/rooms/project-state.ts`
- `src/cli/operations.ts`
- tests for project replay/freshness

Out of scope:

- Replacing full-file snapshots with Yjs per-file updates.
- Full conflict-resolution UI redesign.
- Changing record `seq` assignment on the server.

## Steps

### Step 1: Track Last Applied Seq Per Project File

In web replay, store the latest applied append-log `seq` per normalized file path. A remote file snapshot should be stale only if its `rec.seq` is less than or equal to the last applied seq for that path.

Keep `updatedAt` on records for display and human timeline sorting only.

**Verify**: `npm run web:build` exits 0.

### Step 2: Apply The Same Rule In Shared/CLI Replay

Change CLI/shared project replay to use append-log order rather than `updatedAt` comparisons. If the helper only receives decoded snapshots, pass the record seq alongside decoded payloads or move the comparison to the loop that still has the record.

**Verify**: `npm test` and `npm run typecheck` exit 0.

### Step 3: Add Skew Tests

Create tests where:

- seq 2 has an older timestamp than seq 1 but still wins
- duplicate/older seq is ignored or rejected through sequence validation
- display `updatedAt` remains available in summaries

**Verify**: focused tests pass.

## Test Plan

- Add project-state tests near existing server/CLI operation tests.
- Prefer pure replay tests over browser-only tests.
- Run full baseline after focused tests.

## Done Criteria

- [ ] Project freshness uses append-log sequence, not client clocks.
- [ ] Skewed timestamp regression tests pass.
- [ ] Timestamps remain available for display.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- Project replay code cannot access `seq` without a broad replay architecture change; if so, report back and coordinate with plan 011.

## Maintenance Notes

Plan 010 can then optimize snapshots without preserving broken timestamp ordering.
