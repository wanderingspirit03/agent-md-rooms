# Plan 005: Make Proposal Decisions Recoverable

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/cli/operations.ts src/rooms/proposals.ts src/rooms/timeline.ts apps/web/app/room/[roomId]/page.tsx apps/web/components/room/types.ts src/cli/operations.test.ts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/004-serialize-web-replay-and-sequence-errors.md
- **Category**: bug
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Accepting a proposal currently writes the document update, project snapshot, and accepted status event as separate append-log records. If the first or second write succeeds and the accepted event fails, the room content can change while the proposal remains pending. Retrying may then fail the base-hash check because the proposed state has already landed.

## Current State

- CLI: `src/cli/operations.ts:668-681` appends document update, project snapshot, then accepted event.
- Web: `apps/web/app/room/[roomId]/page.tsx:499-527` posts document, project, then event.
- `src/cli/operations.ts:657-664` checks the proposal base against current state before accept.
- `src/cli/operations.ts:1057-1064` can replay `event.acceptedProject` when present.
- `src/rooms/timeline.ts` has generic event helpers but optional accepted-project persistence must be verified.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Proposal tests | `npm test -- src/cli/operations.test.ts` | exit 0 |
| Root tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `src/cli/operations.ts`
- `src/rooms/proposals.ts`
- `src/rooms/timeline.ts`
- `apps/web/app/room/[roomId]/page.tsx`
- `apps/web/components/room/types.ts`
- proposal tests

Out of scope:

- Database transactions or server-side plaintext proposal state.
- Changing the default suggestions workflow.
- Direct edit mode.

## Steps

### Step 1: Choose A Recoverable Decision Contract

Implement one of these contracts:

- Preferred: make the encrypted accepted event carry enough `acceptedProject` and document hash information that replay can reconstruct the accepted project even if no separate project snapshot exists.
- Acceptable: keep multiple writes but make retry detect that the accepted content already landed and append/repair the missing status event idempotently.

The contract must work in CLI and web, and status must remain derived from encrypted room records.

**Verify**: write down the chosen contract in code comments only where it prevents misuse; run `npm run typecheck`.

### Step 2: Update CLI Accept

Adjust `acceptProposal` so it cannot leave an unrecoverable partial accept. If using accepted-event-as-source, append the event before or instead of redundant project snapshot as appropriate, and ensure `currentProjectFromRecords` replays it.

Add idempotent retry behavior for the case where proposed project/document already matches but status is missing.

**Verify**: `npm test -- src/cli/operations.test.ts` passes.

### Step 3: Update Web Accept

Mirror the same contract in `handleAcceptProposal`. Do not apply local accepted project state before the durable encrypted decision path has succeeded unless replay can safely reconcile it.

**Verify**: `npm run web:build` exits 0.

### Step 4: Add Failure-Mode Tests

Add tests that simulate:

- accept write succeeds fully and proposal becomes accepted
- missing project snapshot still replays from accepted event
- retry after partially landed accepted project repairs status instead of failing base hash

**Verify**: focused proposal tests pass.

## Test Plan

- Model tests on existing proposal acceptance tests in `src/cli/operations.test.ts`.
- Add a replay-level test if proposal replay helpers expose a clean seam.
- Web behavior can be covered by pure helper tests if UI component testing is not established.

## Done Criteria

- [ ] Accept is recoverable or idempotent across CLI and web.
- [ ] Replay derives accepted project/status from encrypted records without trusting plaintext server state.
- [ ] Partial accept regression tests exist.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- A correct fix requires a server-side transaction or plaintext status field.
- Existing record schemas cannot represent accepted project state without a migration design.

## Maintenance Notes

This plan intentionally stabilizes semantics before plan 010 reduces proposal payloads.
