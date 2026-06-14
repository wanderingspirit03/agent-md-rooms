# Plan 013: Add Self-Hosting And Agent Context Direction Work

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- PLAN.md README.md docs src/cli src/deploy src/hosted Dockerfile docker-compose.yml .env.example`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-restore-non-mutating-verification-gates.md, plans/012-unify-room-access-invite-recent-room-and-persona-models.md
- **Category**: direction, docs, dx
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

The product direction calls for easy OSS self-hosting and a machine-friendly agent handoff command, but both are incomplete. Dockerfile/deploy work has started, while Docker Compose and `fold context --room` remain useful next steps. This plan turns direction findings into bounded execution work rather than broad roadmap drift.

## Current State

- `PLAN.md` Phase 2 calls for Docker Compose with persistent append-log volume and simple self-hosting docs.
- `PLAN.md` proposes `fold context --room <url-or-token>` with accepted Markdown, room instructions, unresolved comments, pending suggestions, decisions, and safe persona metadata.
- Current CLI commands include publish/status/export/propose/proposals/show-proposal/accept/reject/comment flows, but not `context`.
- The working tree already contains deploy-related files such as `Dockerfile`, `.env.example`, `docs/deploy.md`, `src/deploy/`, and `src/hosted/`; inspect and preserve user changes before editing.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Root tests | `npm test` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |
| Docker config check | `docker compose config` | exit 0 if Docker is available |

## Scope

In scope:

- `docker-compose.yml` if absent
- `.env.example`
- `docs/deploy.md`
- `README.md`
- `src/cli` for a bounded `context` command
- tests for context output

Out of scope:

- Billing/accounts/team workspaces.
- Full agent-run archives.
- Server-side plaintext search or analytics.
- Strong malicious-server protocol hardening beyond existing documented caveats.

## Steps

### Step 1: Reconcile Existing Deploy Work

Read current deploy-related files and identify what is user-authored. Do not overwrite unrelated changes. Add a minimal `docker-compose.yml` only if one does not exist, using a persistent append-log volume and documented env vars.

**Verify**: `docker compose config` exits 0 if Docker Compose is installed. If not installed, note that verification was skipped.

### Step 2: Tighten Self-Hosting Docs

Update deploy docs with:

- local server start
- hosted app/server start
- Docker Compose path
- persistent volume location
- local-only URL warning
- E2EE caveat: server stores encrypted payloads plus plaintext routing metadata only

**Verify**: docs mention `roomId`, `seq`, and `senderId` as plaintext routing metadata, not document content.

### Step 3: Add `fold context --room`

Implement a read-only CLI command that outputs a safe context packet for agent handoff. Include:

- accepted Markdown/project files
- unresolved comments
- pending proposals and summaries
- accepted/rejected proposal summaries
- open decisions if supported by existing comment types
- safe persona metadata

Do not include room tokens by default; follow plan 001 redaction rules.

**Verify**: `npm test -- src/cli/operations.test.ts` passes.

### Step 4: Document Context Packet Schema

Add docs for the JSON shape and the intended agent workflow. Be precise that all room payloads are decrypted client-side and that server records remain opaque to the server.

**Verify**: `npm run typecheck` and docs grep for `fold context`.

## Test Plan

- Add CLI tests for context output on:
  - simple published room
  - room with unresolved comments
  - room with pending and accepted proposals
  - redacted room output
- Run root tests/typecheck/web build.

## Done Criteria

- [ ] Self-hosting docs and compose config are coherent and verified where possible.
- [ ] `fold context --room` exists, is documented, and is tested.
- [ ] Context output does not include room tokens by default.
- [ ] Baseline verification passes.
- [ ] `plans/README.md` status row updated.

## STOP Conditions

- Existing deploy files contain uncommitted user changes that conflict with this scope.
- Context output would require new encrypted room state not yet modeled; if so, implement only the fields derivable from current replay and document omitted fields.

## Maintenance Notes

Future room instructions and typed review notes can extend the context packet without changing the command's purpose.
