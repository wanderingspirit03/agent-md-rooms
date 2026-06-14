# Plan 009: Move Presence Off The Durable Append Log

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- apps/web/app/room/[roomId]/page.tsx src/server/append-log.ts src/server/append-log.test.ts src/rooms`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/004-serialize-web-replay-and-sequence-errors.md
- **Category**: perf, security
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Presence is ephemeral, but the web client sends encrypted presence records through the same durable append-log path as document and proposal records. Every idle room accumulates expired presence every 25 seconds per client, increasing replay and decrypt work forever.

## Current State

- `apps/web/app/room/[roomId]/page.tsx:1041-1090` sends presence on connect and every 25 seconds.
- The client sends presence as WebSocket `{ type: "encrypted-update", update: ... }`.
- `src/server/append-log.ts:340-341` appends every WebSocket encrypted update to the durable store and broadcasts it.
- `page.tsx:417-423` decrypts replayed presence records before expiry filtering.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Server tests | `npm test -- src/server/append-log.test.ts` | exit 0 |
| Root tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |

## Scope

In scope:

- `src/server/append-log.ts`
- `src/server/append-log.test.ts`
- `apps/web/app/room/[roomId]/page.tsx`
- small shared types if needed

Out of scope:

- Plaintext presence.
- Durable awareness history.
- Full Yjs awareness provider integration.

## Steps

### Step 1: Add A Volatile Presence Message Type

Extend the WebSocket protocol with a presence-specific message that is encrypted but not persisted. For example:

```json
{ "type": "presence", "update": { "senderId": "...", "nonce": "...", "ciphertext": "..." } }
```

The server should validate message size and shape, then broadcast to current room clients without calling `store.append`.

**Verify**: server tests show presence messages do not increase room `recordCount`.

### Step 2: Update Web Presence Sender

Change web presence sends to use the volatile message type over open WebSocket. If the socket is not open, skip presence rather than falling back to HTTP append.

**Verify**: `npm run web:build` exits 0.

### Step 3: Keep Durable Replay Backward-Compatible

Existing append logs may contain old presence records. Keep the client able to decrypt/filter them during replay, but ensure new presence is not appended.

**Verify**: existing tests pass.

### Step 4: Add Server And Client Regression Tests

Test that:

- websocket presence broadcasts to other clients
- presence does not affect status `recordCount`
- normal encrypted updates still append and replay

**Verify**: focused server tests and baseline tests pass.

## Done Criteria

- [ ] New presence updates are volatile and encrypted.
- [ ] Presence does not increase append-log record count.
- [ ] Old durable presence records do not break replay.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- Current client/server protocol cannot distinguish volatile presence without breaking normal sync.
- The only feasible implementation would send plaintext presence.

## Maintenance Notes

This is an incremental fix. A future dedicated awareness channel can replace the temporary volatile message type.
