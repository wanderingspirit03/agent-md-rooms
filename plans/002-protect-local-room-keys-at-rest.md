# Plan 002: Protect Local Room Keys At Rest

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/rooms/metadata.ts src/cli apps/web/app/page.tsx apps/web/app/room/[roomId]/page.tsx apps/web/components/room README.md docs/cli.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Fold room keys decrypt room contents. The CLI writes `.fold/rooms.json` with default file permissions, and the web workspace stores room keys in `localStorage` by default. That is convenient, but it widens the blast radius of shared machines, permissive umasks, same-origin script compromise, and browser profile reuse.

## Current State

- `src/rooms/metadata.ts:19` stores `token` in each room metadata entry.
- `src/rooms/metadata.ts:28` uses `.fold/rooms.json`.
- `src/rooms/metadata.ts:51-53` uses `mkdir` and `writeFile` without explicit modes.
- `apps/web/app/page.tsx:17-27` defines `RecentRoom` with `key`.
- `apps/web/app/page.tsx:49-67`, `85`, and `100` save keys to `localStorage`.
- `apps/web/app/room/[roomId]/page.tsx:1258-1268` and `1525-1555` persist the active `roomSecret` back into recent rooms.

Repo constraints:

- Never send the room key to the server.
- Local room profiles may store access tokens only when a user or agent opts into local metadata.
- Keep room URLs as `/room/:roomId#key=...`; the fragment remains the default transfer mechanism.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `src/rooms/metadata.ts`
- `src/cli/operations.test.ts` or a new focused metadata test
- `apps/web/app/page.tsx`
- `apps/web/app/room/[roomId]/page.tsx`
- shared web recent-room helpers if introduced
- `README.md` and `docs/cli.md` for updated storage behavior

Out of scope:

- OS keychain integration.
- Full room-key rotation or revocation.
- Removing explicit CLI metadata save flows.

## Steps

### Step 1: Restrict CLI Metadata Permissions

Update metadata writes so `.fold` is created with `0700` where supported and `rooms.json` is written with `0600`. Preserve existing behavior on platforms where POSIX modes are not meaningful, but document/test the POSIX path.

Use `fs.open` or `writeFile` options as appropriate; ensure subsequent updates keep restrictive permissions.

**Verify**: `npm test -- src/cli/operations.test.ts` or the new metadata test exits 0.

### Step 2: Stop Browser Key Persistence By Default

Change browser recent-room records so the default persisted record contains room id, display name, source, visit time, and review counts, but not `key`. Opening a recent room without a remembered key should route to `/room/:roomId` and show the existing access gate asking for a key/link.

Allow explicit opt-in only if there is already a suitable UI affordance. If adding an affordance would require substantial UI design, skip opt-in and provide non-persistence by default with a clear forget behavior.

**Verify**: `npm run web:build` exits 0.

### Step 3: Migrate Old Browser Records Safely

Make `normalizeRecentRooms` and `normalizeLocalRecentRooms` tolerate old records with `key` but drop the key when writing the next normalized record. Do not crash on existing localStorage.

**Verify**: Add/adjust tests if web helper tests exist; otherwise run `npm run web:build`.

### Step 4: Update Docs

Update docs to distinguish:

- URL fragment or paste-in key for browser access.
- CLI `.fold/rooms.json` saved metadata with restrictive local permissions.
- Browser recent rooms store non-secret convenience metadata by default.

**Verify**: `rg "localStorage.*key|recent.*key|rooms.json" README.md docs/cli.md apps/web/app` shows only intentional references.

## Test Plan

- Add POSIX-mode assertions for `.fold` and `.fold/rooms.json`; skip or adapt on non-POSIX.
- Add a web normalizer test if there is a nearby web test harness; otherwise extract the normalizer into a testable helper as part of plan 012 and include a TODO in this plan.
- Manually inspect that old localStorage shapes do not crash normalization.

## Done Criteria

- [ ] `.fold/rooms.json` is written with restrictive permissions on POSIX.
- [ ] Browser recent-room persistence no longer stores room keys by default.
- [ ] Existing old localStorage records are tolerated and rewritten without keys.
- [ ] `npm test`, `npm run typecheck`, and `npm run web:build` pass.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- The fix requires a new account system, server-side recovery, or key rotation.
- A required user flow cannot open a recent room without silently persisting the key.

## Maintenance Notes

Plan 012 should later unify the duplicated recent-room schemas. This plan is allowed to make a narrow safe fix first.
