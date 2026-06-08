# Fold

Fold is an early OSS product plan and spike repo for private collaborative rooms around Markdown files created by humans and agents.

The goal is an Excalidraw-style sharing layer and Notion-leaning reader/editor where any `.md` file can become a room: humans and agents can review, edit, comment, submit proposals, keep distinct personas, and export clean Markdown.

Start with [PLAN.md](PLAN.md).

## Current Status

This repository currently contains the product/technical plan, the executable E2EE/document-model spikes, an early server-backed CLI, and a prototype web room surface.

The E2EE Yjs append-log spike supports the v1 direction of a custom encrypted WebSocket provider where the server stores opaque encrypted Yjs payloads plus plaintext routing metadata (`roomId`, `seq`, `senderId`). Document Markdown, proposal records, proposal status events, timeline events, and persona metadata stay encrypted room payloads that are decrypted and replayed client-side.

## Local Server Flow

Install dependencies:

```bash
npm install
```

Start the append-log server with file-backed persistence:

```bash
npm run server -- --port 8787 --data ./data
```

The server defaults to `--host 127.0.0.1`, `--port 8787`, and `--data ./data/append-log` when flags are omitted. Check it with:

```bash
curl http://127.0.0.1:8787/health
```

Publish a Markdown file or directory into an encrypted room and save a local alias:

```bash
npm run cli -- publish ./notes.md --server http://127.0.0.1:8787 --alias notes
```

The publish output includes a room URL and a `fold:v1:` token. Use the saved alias, room URL, or token as `--room` for follow-up commands:

```bash
npm run cli -- status --room notes
npm run cli -- export --room notes --output ./exported.md
npm run cli -- propose ./proposal.md --room notes --title 'Tighten the draft' --comment 'Clarifies the opening section.'
npm run cli -- proposals --room notes
npm run cli -- show-proposal '<proposal-id>' --room notes
npm run cli -- accept '<proposal-id>' --room notes
npm run cli -- reject '<proposal-id>' --room notes
npm run cli -- room invite notes --for agent
```

The older `patch` command remains available as a compatibility wrapper around proposal submission:

```bash
npm run cli -- patch ./proposal.md --room notes --summary 'Tighten the draft'
```

The room key stays in the URL fragment or local token and is not sent to the server. The server persists encrypted update payloads plus plaintext routing metadata only. Proposal statuses are not mutable server-side state; clients derive them by decrypting and replaying room records.

Room aliases are stored in `.fold/rooms.json`. Treat that file as secret because it contains room key material. Room profiles track separate `appUrl` and `syncUrl` values so a room can run on a Mac, a LAN/tunnel, or a hosted platform such as Railway.

## Guiding Principles

- Markdown stays portable and exportable.
- Agent workflows should be CLI-first and machine-friendly.
- Sharing should feel lightweight, like Excalidraw room links.
- Editing should feel polished, closer to Notion than a raw text editor.
- Humans and agents should be legible participants with distinct personas, not anonymous writes.
- Agent changes should carry commit-like explanations, diffs, review status, and comments.
- OSS dependencies should be permissive by default and license-reviewed before adoption.
