# Plan 001: Redact Secret-Bearing Outputs

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- src/cli src/rooms scripts docs/cli.md README.md package.json`
> If any in-scope file changed since this plan was written, compare the current state below against the live code before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security, tests
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

Fold room URLs and tokens carry client-side key material. The CLI currently serializes command results unchanged for `--json`, and routine commands such as `export`, `status`, `propose`, `show-proposal`, `accept`, and `reject` include `room.url` and `room.token`. That leaks decryption-capable material into logs, agent transcripts, CI output, and smoke logs even when the command does not need to create or show an invite.

## Current State

- `src/cli/output.ts:20` writes `JSON.stringify(value, null, 2)` unchanged.
- `src/cli/operations.ts:356`, `392`, `477`, `644`, and `689` return `publicRoomResult(reference, createRoomToken(reference))` from non-invite workflows.
- `src/cli/output.ts:35-39` and `48-52` intentionally print URL/token for publish/create human flows; preserve those explicit invite-producing flows.
- Smoke scripts print room URLs/tokens even though `README.md` says room URLs and tokens are secrets.

Repo constraints:

- Never send the room key to the server.
- Preserve `--json` support on every CLI command, but make secret-bearing fields explicit and limited to create/invite/show-secret style workflows.
- Do not reproduce real token values in tests, docs, or plan output.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Unit tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| E2EE spike | `npm run spike:e2ee` | exit 0 |
| Document model spike | `npm run spike:document-model` | exit 0 |

## Scope

In scope:

- `src/cli/results.ts`
- `src/cli/operations.ts`
- `src/cli/output.ts`
- `src/cli/operations.test.ts`
- `scripts/web-*-smoke.ts`
- `docs/cli.md`
- `README.md` only where command output examples require redaction updates

Out of scope:

- Changing encryption, room-token encoding, or server API shape.
- Removing URL/token output from `publish`, `room create`, or explicit invite flows.
- Persisting or rotating existing leaked tokens.

## Steps

### Step 1: Define Safe Room Output Shapes

Add a safe room-output helper for routine commands. It should include non-secret routing data such as `roomId`, `serverRoomUrl`, `appUrl`/`syncUrl` when already exposed, and `hasClientKey: true`; it must omit `url`, `token`, and `roomSecret`.

Keep the existing full invite helper for publish/create/invite command results. Name helpers so reviewers can tell which one is secret-bearing.

**Verify**: `npm run typecheck` exits 0.

### Step 2: Apply Redaction To Routine CLI Results

Change non-invite results to use the safe helper:

- `exportMarkdown`
- `roomStatus`
- `proposeMarkdown`
- `listProposals`
- `showProposal`
- `acceptProposal`
- `rejectProposal`
- comment and room-status style commands if they return `publicRoomResult`

Do not change `publish`, `room create`, `room invite`, or any intentionally secret-printing command.

**Verify**: `npm test -- src/cli/operations.test.ts` passes.

### Step 3: Update Tests For Redaction

Add assertions that routine JSON results do not contain `room.url`, `room.token`, `roomSecret`, or fragment keys. Add positive assertions that explicit invite-producing commands still expose a usable URL/token.

**Verify**: `npm test -- src/cli/operations.test.ts` passes and fails if a routine command reintroduces `room.token`.

### Step 4: Redact Smoke Script Output

Update web smoke scripts so console output includes only non-secret room ids, server origins, and artifact paths. Keep full room references in memory only.

Search target:

```bash
rg "roomUrl|token|#key=|fold:v1" scripts src/cli docs README.md
```

Expected after the change: only explicit invite/create docs or code paths contain secret-bearing output.

**Verify**: `rg "console\\.log.*(roomUrl|token|#key=|fold:v1)" scripts` returns no matches.

## Test Plan

- Extend `src/cli/operations.test.ts` with redaction tests for `status`, `export`, and `propose`.
- Add one positive test for an invite/create flow so executors do not redact every path blindly.
- Run the baseline CLI tests and typecheck.

## Done Criteria

- [ ] Routine CLI JSON results omit decryption-capable tokens and fragment URLs.
- [ ] Explicit create/publish/invite flows still provide room access material.
- [ ] Smoke scripts do not print room URLs, tokens, or fragment keys.
- [ ] `npm test`, `npm run typecheck`, `npm run spike:e2ee`, and `npm run spike:document-model` pass.
- [ ] `plans/README.md` marks plan 001 as DONE or BLOCKED.

## STOP Conditions

- A downstream test proves external JSON consumers require `room.token` on routine commands and no compatibility path is obvious.
- The fix requires changing the room-token format or server API.
- Any test fixture contains real-looking non-test room secrets.

## Maintenance Notes

Future commands should choose between safe room output and explicit secret-bearing invite output at the result-construction boundary, not in the generic JSON writer.
