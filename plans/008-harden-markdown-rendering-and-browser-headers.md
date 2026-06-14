# Plan 008: Harden Markdown Rendering And Browser Headers

> **Executor instructions**: Follow this plan step by step. Run each verification command before moving on. If a STOP condition occurs, stop and report instead of improvising.
>
> **Drift check (run first)**: `git diff --stat eb5e8d7..HEAD -- apps/web/components/MarkdownRenderer.tsx apps/web/components/MermaidDiagram.tsx apps/web/next.config.js apps/web/app/layout.tsx apps/web/app/globals.css src/web README.md PLAN.md`

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/003-restore-non-mutating-verification-gates.md
- **Category**: security, tests
- **Planned at**: commit `eb5e8d7`, 2026-06-14

## Why This Matters

The browser holds room keys and renders decrypted room Markdown. The current renderer inserts Mermaid-produced SVG with `dangerouslySetInnerHTML`, while docs say Mermaid fences should be placeholders until sanitized/isolated. The hosted app also lacks CSP and related browser hardening headers.

## Current State

- `apps/web/components/MarkdownRenderer.tsx:40-42` uses `ReactMarkdown` with GFM, math, KaTeX, and sanitize.
- `MarkdownRenderer.tsx:112-114` renders Mermaid fences through `MermaidDiagram`.
- `apps/web/components/MermaidDiagram.tsx:26-47` imports Mermaid and renders untrusted chart text.
- `MermaidDiagram.tsx:80-85` inserts SVG via `dangerouslySetInnerHTML`.
- `apps/web/next.config.js:4-10` has no `headers()` policy.
- `apps/web/app/layout.tsx:18-22` uses an inline theme script.
- `PLAN.md` requires Mermaid placeholders first and live Mermaid only behind sanitized/isolated rendering.

## Commands You Will Need

| Purpose | Command | Expected |
|---|---|---|
| Web build | `npm run web:build` | exit 0 |
| Web typecheck/check | command from plan 003 | exit 0 |
| Root tests | `npm test` | exit 0 |

## Scope

In scope:

- `apps/web/components/MarkdownRenderer.tsx`
- `apps/web/components/MermaidDiagram.tsx`
- `apps/web/next.config.js`
- `apps/web/app/layout.tsx`
- renderer tests under `src/web` or app test harness
- docs only if behavior changes

Out of scope:

- Rendering unsanitized raw HTML.
- Adding a broad rich editor change.
- Building a full sandbox service.

## Steps

### Step 1: Align Mermaid Behavior With The Locked Renderer Direction

Choose one safe path:

- Revert Mermaid fences to explicit source placeholders with no live SVG insertion.
- Or isolate live rendering behind a sandboxed iframe or strict SVG sanitizer with tests proving dangerous SVG/HTML/event attributes are blocked.

The lower-risk v1 path is placeholders.

**Verify**: `rg "dangerouslySetInnerHTML" apps/web/components/MermaidDiagram.tsx apps/web/components/MarkdownRenderer.tsx` returns no Mermaid SVG insertion path unless it is a reviewed sanitizer/sandbox path.

### Step 2: Add Renderer Security Regression Tests

Cover:

- raw HTML is stripped or escaped
- dangerous links do not become unsafe anchors
- math still renders acceptably with KaTeX/sanitize
- Mermaid follows the chosen placeholder or sanitized/isolated behavior

**Verify**: focused renderer tests pass.

### Step 3: Add Browser Hardening Headers

Implement a Next `headers()` policy in `apps/web/next.config.js`:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `frame-ancestors` through CSP

Handle the inline theme script by moving it to a CSP-compatible external script, using a hash, or otherwise making the policy pass without unsafe broad allowances.

**Verify**: `npm run web:build` exits 0.

### Step 4: Verify Hosted Path

If `src/hosted/entrypoint.ts` proxies Next responses without preserving headers, update it narrowly so headers survive or are added at the Next layer for hosted output.

**Verify**: local hosted smoke or `npm run web:build` plus inspection of configured headers.

## Test Plan

- Add focused renderer tests in the existing web test style.
- If header tests are feasible, add a small assertion against `next.config.js` exported headers.
- Run web build and root tests.

## Done Criteria

- [ ] Mermaid no longer injects unsanitized/generated SVG into the room page, or it is isolated/sanitized with tests.
- [ ] Renderer regression tests cover raw HTML, dangerous links, math, and Mermaid behavior.
- [ ] CSP and browser hardening headers are configured.
- [ ] Theme bootstrapping still works.
- [ ] Baseline verification passes.

## STOP Conditions

- A CSP that meaningfully protects the app cannot coexist with current inline/dynamic behavior without a larger design change.
- Sanitized live Mermaid cannot be proven safe with small, focused tests.

## Maintenance Notes

Any future renderer dependency upgrade should run the renderer security tests before release.
