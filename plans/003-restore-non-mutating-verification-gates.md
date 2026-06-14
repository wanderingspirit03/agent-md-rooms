# Plan 003: Restore Non-Mutating Verification Gates

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- package.json apps/web/package.json tsconfig.json apps/web/tsconfig.json spikes/document-model README.md AGENTS.md scripts`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests, dx
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

The repo asks agents to run checks before reporting completion, but one required check mutates tracked report files and the web app is not covered by the root typecheck. The app lint script also fails because `next lint` is not available in the current Next setup. Later correctness and security changes need reliable gates.

## Current State

- `package.json:28-32` defines `spike:e2ee`, `spike:document-model`, `spike:document-model:report`, `test`, and `typecheck`.
- `spikes/document-model/run-comparison.ts:94-95` writes tracked report artifacts.
- `tsconfig.json:13` includes only `spikes/**/*.ts`, `src/**/*.ts`, and `scripts/**/*.ts`, not `apps/web`.
- `apps/web/package.json:9` has `"lint": "next lint"`, which failed during audit.
- `package.json:19` has `web:build`, and it passed during audit.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Root tests | `npm test` | exit 0 |
| Root typecheck | `npm run typecheck` | exit 0 |
| Web build | `npm run web:build` | exit 0 |
| Web lint/typecheck | command introduced by this plan | exit 0 |

## Scope

In scope:

- `package.json`
- `apps/web/package.json`
- `tsconfig.json` or added root verification script/config
- `spikes/document-model/run-comparison.ts`
- `README.md`
- `AGENTS.md`
- optional test wrapper scripts under `scripts/`

Out of scope:

- Formatting the entire repo.
- Rewriting the document-model spike logic.
- Adding heavyweight CI if the repo has no CI conventions yet.

## Steps

### Step 1: Split Mutating Report Generation From Check Mode

Add a non-mutating document-model report check. Options:

- Add `--check` to `spikes/document-model/run-comparison.ts` that computes report content and compares it with tracked artifacts without writing.
- Or move generated report output to an ignored directory and keep tracked report updates explicit.

Update package scripts so the required completion command is non-mutating. Keep a separate explicit regenerate command.

**Verify**: run the new check, then `git diff -- spikes/document-model` should show no report file changes caused by the check.

### Step 2: Add Supported Web Verification

Replace `apps/web` lint with a supported command. If ESLint is not configured, prefer adding an explicit web typecheck script over pretending lint exists. For example:

- `web:typecheck`: `tsc --noEmit --project apps/web/tsconfig.json`
- `web:check`: web typecheck plus build

Do not add a large lint stack unless it is already present or trivial.

**Verify**: `npm run web:typecheck` and `npm run web:build` exit 0.

### Step 3: Add A Root Verification Script

Add a root script such as `check` that runs:

```bash
npm test
npm run typecheck
npm run spike:e2ee
npm run spike:document-model
npm run spike:document-model:report:check
npm run web:typecheck
npm run web:build
```

Use script names that match the final implementation. Keep commands serial and obvious.

**Verify**: `npm run check` exits 0 and leaves `git diff --stat` unchanged except for planned source/config edits.

### Step 4: Update Agent-Facing Docs

Update `AGENTS.md` and `README.md` to list the non-mutating command set. Mention the explicit report regeneration command separately.

**Verify**: `rg "spike:document-model:report" AGENTS.md README.md package.json` shows the check/regenerate distinction.

## Test Plan

- Add a focused test for report generation if practical, or ensure the check mode compares deterministic strings.
- Run the new full check script.

## Done Criteria

- [ ] Mandatory verification commands are non-mutating.
- [ ] Web TypeScript/build verification is reachable from the root.
- [ ] Broken `next lint` is replaced or removed.
- [ ] Docs and AGENTS instructions match the scripts.
- [ ] `npm run check` exits 0.

## STOP Conditions

- `apps/web/tsconfig.json` cannot typecheck without changing product code.
- The report generator is nondeterministic in a way that makes check mode impossible without changing spike behavior.

## Maintenance Notes

Future plans should use `npm run check` once this lands, plus any plan-specific focused tests.
