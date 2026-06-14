# Plan 010: Reduce Project Proposal And Replay Payload Cost

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/cli/operations.ts src/rooms/proposals.ts src/rooms/project-state.ts apps/web/app/room/[roomId]/page.tsx apps/web/components`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/005-make-proposal-decisions-recoverable.md, plans/006-use-append-log-order-for-project-freshness.md
- **Category**: perf
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Basic commands decrypt and scan more history than they need, and single-file proposals can carry full project payloads. As agent-authored Markdown projects grow, `status`, `export`, `propose`, browser replay, and proposal listing will slow down and allocate too much.

## Current State

- `src/cli/operations.ts:1025` calls `replayProposalsFromRecords` inside `currentProjectFromRecords`.
- `src/cli/operations.ts:448-462` creates full `proposedProject` even for single-file proposals.
- `src/rooms/proposals.ts` stores proposal Markdown plus optional full base/proposed project summaries.
- `apps/web/app/room/[roomId]/page.tsx:873-906` emits full-file snapshots after a 700 ms debounce.
- `src/server/append-log.ts:107`, `123`, `287`, and `323` use sync file IO/full-list operations.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `src/cli/operations.ts`
- `src/rooms/proposals.ts`
- `src/rooms/project-state.ts`
- `src/server/append-log.ts` only for low-risk status/backlog counters if included
- focused tests

Out of scope:

- Append-log compaction.
- Database storage.
- Per-file Yjs updates.
- Removing Markdown-canonical source of truth.

## Steps

### Step 1: Add Lightweight Project Replay

Introduce a project-only replay path that decrypts only records needed for current accepted project state. It should avoid full proposal/timeline replay except when needed for legacy accepted events that lack accepted project payloads.

**Verify**: existing export/status/propose tests pass.

### Step 2: Compact Single-File Proposal Records

For single-file proposals, store target path, base project hash, proposed file Markdown, compact display diff, and enough metadata to materialize the full accepted project on accept. Avoid duplicating the full unchanged project in every proposal record.

Maintain backward-compatible replay for existing full-project proposal records.

**Verify**: proposal list/show/accept tests pass for both old and new shapes.

### Step 3: Reduce Snapshot Replay Work

Where project replay repeatedly calls `replaceProjectFile` and sorts the whole project, switch to an internal mutable path map and normalize once at the end. Preserve external `ProjectSnapshot` output shape.

**Verify**: project-state tests pass and output summaries are unchanged.

### Step 4: Server Low-Risk Counters

If still small after steps 1-3, add store-level status counters so `GET /rooms/:id/status` does not clone the whole list just to count/latest. Do not rewrite append IO in this plan unless it stays isolated and tested.

**Verify**: `npm test -- src/server/append-log.test.ts` passes.

## Test Plan

- Add backward-compatibility tests for old full-project proposals.
- Add new compact single-file proposal tests.
- Add project replay tests that confirm accepted state without decrypting all proposal details where possible.

## Done Criteria

- [ ] Current project replay no longer eagerly replays all proposal details in common paths.
- [ ] Single-file proposals avoid carrying full unchanged project payloads.
- [ ] Backward-compatible replay is preserved.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- Compact proposal shape cannot be accepted safely without the recoverable accept contract from plan 005.
- The optimization requires a migration that would break existing room logs.

## Maintenance Notes

Do not sacrifice E2EE or raw Markdown fidelity for performance. Optimize replay boundaries and payload shapes first.
