# Plan 012: Unify Room Access, Invite, Recent-Room, And Persona Models

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/rooms apps/web/app/page.tsx apps/web/app/room/[roomId]/page.tsx apps/web/lib/personas.ts src/cli/operations.ts apps/web/components/room`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/001-redact-secret-bearing-outputs.md, plans/002-protect-local-room-keys-at-rest.md
- **Category**: tech-debt
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

The web app and CLI duplicate room token encoding, invite text, recent-room schemas, and persona assignment. That increases the odds that agents and humans see different identities or incompatible room references, which cuts against Fold's agent-friendly CLI and visible persona direction.

## Current State

- Browser recent room shapes exist in both `apps/web/app/page.tsx:17-27` and `apps/web/app/room/[roomId]/page.tsx`.
- Normalizers are duplicated in `apps/web/app/page.tsx:405-424` and `apps/web/app/room/[roomId]/page.tsx:1561`.
- Browser token encoding lives at `apps/web/app/room/[roomId]/page.tsx:2073-2082`.
- CLI/domain token handling lives in `src/rooms/room-reference.ts`.
- Web personas live in `apps/web/lib/personas.ts`; CLI/domain personas live in `src/rooms/personas.ts`.
- PLAN says agent personas should be room/system assigned from stable participant fingerprints, not self-declared by agents.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `src/rooms/room-reference.ts`
- `src/rooms/personas.ts`
- browser-safe shared modules under `apps/web/lib` or `src/rooms` if bundling permits
- `apps/web/app/page.tsx`
- `apps/web/app/room/[roomId]/page.tsx`
- `apps/web/lib/personas.ts`
- tests for token/persona/recent-room helpers

Out of scope:

- Account systems or server-side room directories.
- Key persistence changes beyond the contract established in plan 002.
- Visual redesign of the workspace.

## Steps

### Step 1: Create Browser-Safe Shared Room Reference Helpers

Move room-token encode/decode and invite URL construction into a shared module usable from CLI and web. If Node/browser dependencies conflict, create a tiny pure module with separate Node wrappers.

**Verify**: unit tests prove browser and CLI helpers produce compatible tokens.

### Step 2: Create One Recent-Room Schema Helper

Centralize normalization and persistence shape for `fold:recent-rooms`. It must follow plan 002: no key by default unless an explicit opt-in path exists.

**Verify**: tests cover old records with keys, new records without keys, archive/review counters, and invalid JSON tolerance.

### Step 3: Unify Persona Assignment

Make web and CLI use the same persona names/colors and stable hashing behavior. Preserve visible agent-vs-human distinction and do not let agents self-select user-facing personas through CLI flags.

**Verify**: tests assert the same room id, participant kind, and fingerprint produce the same persona in web and CLI code.

### Step 4: Centralize Invite Copy Text

Move human/agent invite text generation to a shared helper or pair of helpers with shared data model. Keep local-only URL warnings from `shareabilityWarnings`, but make invalid URL handling safe as in plan 007.

**Verify**: `npm run web:build` and relevant CLI tests pass.

## Test Plan

- Add pure unit tests for room-token compatibility.
- Add recent-room schema normalization tests.
- Add persona determinism tests.
- Run web build and root tests.

## Done Criteria

- [ ] Browser and CLI room reference helpers are compatible and tested.
- [ ] Recent-room schema is defined in one place.
- [ ] Persona assignment is shared or deterministically equivalent.
- [ ] Invite generation no longer has duplicated incompatible logic.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- Shared modules pull Node-only APIs into the browser bundle.
- Unifying persona hashing would change existing visible persona identity without a migration note.

## Maintenance Notes

This plan should reduce duplication before adding `fold context`, room instructions, or richer agent handoff flows.
