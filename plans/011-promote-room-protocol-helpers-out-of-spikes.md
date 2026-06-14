# Plan 011: Promote Room Protocol Helpers Out Of Spikes

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/rooms src/server spikes/e2ee-yjs-append-log src/cli apps/web`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/004-serialize-web-replay-and-sequence-errors.md, plans/005-make-proposal-decisions-recoverable.md
- **Category**: tech-debt
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Production code imports crypto and protocol types from `spikes/`, and timeline code owns generic encrypted JSON helpers. That makes it unclear what is experimental versus canonical, and it encourages every surface to implement partial replay independently.

## Current State

- `src/rooms/markdown-snapshot.ts` imports encryption helpers from `../../spikes/e2ee-yjs-append-log/crypto.js`.
- `src/rooms/timeline.ts` imports the same spike crypto and exports generic `encryptJsonRecord`/`decryptJsonRecord`.
- `src/server/append-log.ts` imports `EncryptedPayload` from the spike.
- `src/rooms/project-state.ts:8` imports generic encrypted JSON helpers from `timeline.ts`.
- `src/cli/operations.ts:1020-1080`, `src/rooms/proposals.ts`, `src/rooms/comments.ts`, and the web room page all contain partial replay logic.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| E2EE spike | `npm run spike:e2ee` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- new stable module under `src/rooms` or `src/protocol`
- imports in `src/rooms`, `src/server`, `src/cli`, and spikes
- tests for moved helpers

Out of scope:

- Changing cryptographic algorithms.
- Changing encrypted payload wire format.
- A full UI state refactor.

## Steps

### Step 1: Move Crypto Payload Types And Helpers To Stable Source

Create a stable source module for AES-GCM/HKDF room crypto and encrypted payload types. Move or re-export the existing implementation without changing behavior. Production code and spikes should import from the stable module.

**Verify**: `npm run typecheck` and `npm run spike:e2ee` pass.

### Step 2: Move Generic Encrypted JSON Helpers Out Of Timeline

Move `encryptJsonRecord` and `decryptJsonRecord` to a neutral module such as `src/rooms/encrypted-records.ts`. Leave `timeline.ts` focused on timeline schema and replay.

**Verify**: `npm test` passes.

### Step 3: Add A Shared Replay Boundary

Introduce a small shared replay module that validates ordered records and exposes reducers for project, proposals, comments, and timeline. Do not move all web UI state in this plan; instead give CLI and web a stable domain helper to call in future changes.

**Verify**: existing replay tests pass, plus one integration test showing project/proposal/comment replay from the same ordered record list.

### Step 4: Quarantine Or Remove Legacy Patch-Suggestion Code

`src/rooms/patch-suggestion.ts` and old suggestion sender prefixes are legacy now that `patch` wraps `propose`. Either delete unused code if imports prove dead, or move it under an explicitly named legacy folder with tests/docs saying it is not the v1 path.

**Verify**: `rg "patch-suggestion|fold-cli:suggestion" src spikes docs` shows only intentional legacy references or none.

## Test Plan

- Existing crypto spike must pass unchanged.
- Add tests for stable encrypted JSON helpers.
- Add a replay integration test after the shared boundary exists.

## Done Criteria

- [ ] Production code no longer imports protocol crypto from `spikes/`.
- [ ] Generic encrypted JSON helpers are not owned by `timeline.ts`.
- [ ] A small shared replay boundary exists and is tested.
- [ ] Legacy patch-suggestion path is removed or clearly quarantined.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- Moving crypto changes generated ciphertext/decryption behavior unexpectedly.
- Browser bundling cannot consume the stable crypto module without a separate browser adapter.

## Maintenance Notes

Keep this as a boundary move plus small replay foundation. Large UI extraction belongs in later work.
