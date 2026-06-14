# Plan 007: Close Small Replay, Status, Reject, And URL Correctness Gaps

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/cli/operations.ts src/rooms/comments.ts src/rooms/project-state.ts src/rooms/markdown-snapshot.ts apps/web/app/room/[roomId]/page.tsx apps/web/components/room/RoomAccessGate.tsx`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/003-restore-non-mutating-verification-gates.md
- **Category**: bug
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Several small correctness bugs undermine agent workflows: `status` reports stale document metadata, comment/project replay omits contiguous sequence validation, browser reject ignores failed writes, invalid sync URLs can crash invite rendering, and path normalization can miss equivalent paths. These are low-risk fixes that make the room behavior more predictable.

## Current State

- `src/cli/operations.ts:385-400` replays project state but returns `document: entry?.document ?? null`.
- `src/rooms/comments.ts:115-131` replays comments without checking record sequence.
- `src/rooms/project-state.ts:164-208` replays project snapshots without checking record sequence.
- `src/rooms/markdown-snapshot.ts:182-199` has an existing contiguous-record validator pattern for Markdown.
- `apps/web/app/room/[roomId]/page.tsx:647-652` posts reject and closes without checking `response.ok`.
- `apps/web/app/room/[roomId]/page.tsx:2054-2070` calls `new URL(value)` unguarded.
- `src/rooms/project-state.ts:211-217` normalizes slashes but does not collapse leading `./`.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `src/cli/operations.ts`
- `src/rooms/comments.ts`
- `src/rooms/project-state.ts`
- `src/rooms/markdown-snapshot.ts` or a new shared validation helper
- `apps/web/app/room/[roomId]/page.tsx`
- relevant tests

Out of scope:

- Full shared replay architecture.
- Server-side malicious-history proofs.
- UI redesign for URL validation.

## Steps

### Step 1: Share Contiguous Record Validation

Extract or reuse the existing contiguous sequence validation from Markdown/proposal replay and apply it before comment and project replay. It should reject gaps, duplicates, reorder, wrong room id, and non-safe integer seq.

**Verify**: new missing-seq tests pass.

### Step 2: Derive Status Document From Replayed Project

Change `roomStatus` so when encrypted records exist and replay succeeds, `document` summarizes the current primary file from the replayed project. Fall back to local metadata only when no server records exist.

**Verify**: add a test that publishes, changes/accepts content, and confirms `status --json` document summary matches current replay.

### Step 3: Check Reject Writes In The Browser

In `handleRejectProposal`, check `response.ok` the same way nearby accept code does. Keep the dialog open and set `syncError` on failure.

**Verify**: `npm run web:build` exits 0.

### Step 4: Guard Sync URL Parsing

Wrap `shareabilityWarnings` URL parsing in a safe parse path. Invalid sync/app URLs should produce a warning or validation error, not throw during render.

**Verify**: add a pure helper test if extracted; otherwise `npm run web:build`.

### Step 5: Normalize Room Paths Consistently

Update `normalizeProjectPath` to collapse benign `.` path segments while still rejecting `..`, empty paths, absolute paths, and non-Markdown project files where required.

**Verify**: project path tests cover `./docs/a.md` and reject `../secret.md`.

## Test Plan

- Add missing-sequence tests for comments/project replay.
- Add `status` stale-summary regression test.
- Add path normalization cases.
- Add URL parsing helper tests if helper is extracted.

## Done Criteria

- [ ] Comments and project replays validate contiguous seq.
- [ ] `fold status --json` reports current replayed document summary.
- [ ] Browser reject handles failed persistence as an error.
- [ ] Invalid sync URLs do not crash render.
- [ ] Path normalization handles benign `.` segments and rejects traversal.
- [ ] Baseline verification passes.

## STOP Conditions

- Sequence validation breaks legitimate existing replay fixtures because records are intentionally sparse.
- Fixing URL validation requires changing the access gate UX substantially.

## Maintenance Notes

This plan is intentionally a bundle of small correctness repairs. Do not let it turn into the shared replay refactor from plan 011.
