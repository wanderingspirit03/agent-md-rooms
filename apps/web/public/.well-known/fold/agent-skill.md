---
name: fold
version: 0.1.0
description: Work in encrypted Fold Markdown project rooms through the CLI.
homepage: /
---

# Fold Agent Skill

Fold is an encrypted Markdown project room for humans and coding agents. Use the CLI for all room mutations. Browser access is optional for inspection only.

## Security Rules

- Treat room URLs, `fold:v1:` tokens, and `.fold/rooms.json` as secrets.
- Never send a room URL fragment (`#key=...`) to a server API.
- Never paste a room key into logs, issue trackers, pull requests, or third-party services.
- Prefer proposals. Do not directly mutate accepted project state unless the room policy explicitly allows it.
- Do not self-assign a visible persona. Fold assigns agent personas from room/system logic.

## Install

From this repository during development:

```bash
npm install
npm run --silent cli -- --help
```

When packaged, use:

```bash
npm install -g fold
```

## Join A Room

Import the secret room URL or token once, then use the alias. Agent invites normally use a token because it preserves both the web app URL and sync server URL:

```bash
fold room add "fold:v1:..." --alias launch
fold status --room launch --json
```

If `fold` is not installed yet in development, run the same commands through:

```bash
npm run --silent cli -- room add "fold:v1:..." --alias launch
```

## Work On A Project

Export the accepted Markdown project:

```bash
fold export --room launch --output ./fold-project --json
```

Edit files locally, then submit one reviewable proposal:

```bash
fold propose ./fold-project \
  --room launch \
  --title "Update project docs" \
  --comment "Summarizes the changes and any decisions needed." \
  --json
```

For one file:

```bash
fold export --room launch --path docs/PLAN.md --output ./PLAN.md --json
fold propose ./PLAN.md --room launch --path docs/PLAN.md --title "Tighten plan" --json
```

## Review Proposals

```bash
fold proposals --room launch --json
fold show-proposal PROPOSAL_ID --room launch --json
fold accept PROPOSAL_ID --room launch --json
fold reject PROPOSAL_ID --room launch --json
```

Accept/reject only when a human or higher-level workflow explicitly asks you to make the review decision.

## Invite Others

Generate a human invite:

```bash
fold room invite launch --for human
```

Generate an agent invite:

```bash
fold room invite launch --for agent
```

If the invite warns about `localhost`, `127.0.0.1`, or a private LAN address, the room may not be reachable by collaborators outside that machine or network. Ask the human to provide a reachable `appUrl` and `syncUrl`, then update:

```bash
fold room set-url launch \
  --app-url https://fold.example \
  --sync-url https://fold.example
```

## Self-Hosting Notes

- Mac-local single-machine: `localhost` is fine.
- Mac-local collaborators: the server must bind to a reachable host, the firewall must allow the port, and collaborators need a URL that points to the host Mac.
- Hosted platforms such as Railway should use public HTTPS URLs and persistent append-log storage.
- Losing the room key means losing access unless someone still has a saved alias, token, room URL, or export.
