# Plan 004: Serialize Web Replay And Fail Closed On Sequence Gaps

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- apps/web/app/room/[roomId]/page.tsx apps/web/components/room apps/web/lib src/web`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-restore-non-mutating-verification-gates.md
- **Category**: bug
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

The append log is ordered by `seq`, but the web client currently starts one async decrypt/apply operation per WebSocket message. Later records can finish before earlier records, and sequence mismatches set an error while still applying the record. Proposal statuses, comment events, and project snapshots can therefore apply against missing base records.

## Current State

- `apps/web/app/room/[roomId]/page.tsx:279-290` handles every socket message in an async `onmessage` callback.
- `page.tsx:328-335` detects seq mismatch but still appends and processes the record.
- `page.tsx:343-390` status events only update proposals already in state.
- `PLAN.md` says clients should validate contiguous delivered records and catch gaps, duplicates, replays, and reordered records.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Web type/build | `npm run web:build` | exit 0 |
| Root tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |

After plan 003 lands, use `npm run check`.

## Scope

In scope:

- `apps/web/app/room/[roomId]/page.tsx`
- small extracted helper under `apps/web/lib/` if needed
- web tests under existing `src/web` style or a new focused test file

Out of scope:

- Server-side hash chains, fork detection, or signed checkpoints.
- Rewriting all room replay into the shared architecture from plan 011.
- Changing encrypted payload schemas.

## Steps

### Step 1: Add A Per-Connection Replay Queue

Introduce a promise queue or explicit async pump so record N fully validates, decrypts, and applies before record N+1 starts. The queue must belong to the current sync setup and be abandoned on cleanup.

Check `destroyed` after awaited setup work and before applying queued work so stale sockets cannot mutate state.

**Verify**: `npm run web:build` exits 0.

### Step 2: Fail Closed On Sequence Mismatch

When `rec.seq !== expectedSeqRef.current`, set `syncError`, mark the room replay as halted, and do not decrypt or apply that record. Ignore later records until the connection is restarted or a full resync path is implemented.

Do not advance `expectedSeqRef` to the bad record and continue.

**Verify**: Add or update a focused test for the sequence validator helper if extracted; otherwise run `npm run web:build`.

### Step 3: Buffer Dependent Events Or Rely On Queue Ordering

Ensure proposal status/comment events do not no-op because their base record has not yet applied. With a strict queue and fail-closed sequence validation this should naturally hold for ordered logs. If existing backlog can contain status before proposal, add a small pending-event buffer with tests.

**Verify**: `npm test` and `npm run web:build` exit 0.

## Test Plan

- Prefer extracting a tiny ordered-record gate helper and unit-test:
  - accepts seq 1, 2, 3
  - rejects seq 3 when expecting 2
  - rejects duplicate seq 1 after seq 1
  - refuses later records after halted state
- Add a component/helper test if there is an existing web room test harness; otherwise keep pure helper coverage and run web build.

## Done Criteria

- [ ] Web room records apply serially per connection.
- [ ] Sequence mismatch prevents applying the bad record.
- [ ] Stale socket setup cannot apply records after cleanup.
- [ ] Focused tests cover ordered and bad sequence cases.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- The required fix appears to require server protocol changes.
- Applying fail-closed behavior makes normal backlog replay impossible because server messages are not actually contiguous.

## Maintenance Notes

Plan 011 can later move this logic into a shared replay module. This plan should be a focused correctness repair, not a broad architecture rewrite.
