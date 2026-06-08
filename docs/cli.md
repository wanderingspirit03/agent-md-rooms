# mdroom CLI

The CLI is the agent-facing entry point for publishing Markdown rooms, submitting reviewable proposals, accepting/rejecting proposals, checking room status, and exporting canonical Markdown. Commands talk to the encrypted append-log HTTP API; document bodies, proposal bodies, comments, and timeline payloads are encrypted client-side before they leave the CLI.

## Commands

```bash
mdroom publish <file.md> [--server <url>] [--json] [--no-save]
mdroom export --room <url-or-token> [--output <file>] [--json]
mdroom status --room <url-or-token> [--json]
mdroom propose <file.md> --room <url-or-token> [--title <text>] [--comment <text>] [--json]
mdroom proposals --room <url-or-token> [--json]
mdroom show-proposal <proposal-id> --room <url-or-token> [--json]
mdroom accept <proposal-id> --room <url-or-token> [--json]
mdroom reject <proposal-id> --room <url-or-token> [--json]
mdroom patch <file.md> --room <url-or-token> [--summary <text>] [--json]
```

During development, run the CLI through:

```bash
npm run --silent cli -- publish README.md --json
```

For a local fresh setup:

```bash
npm run server -- --port 8787 --data ./data
npm run --silent cli -- publish ./notes.md --server http://127.0.0.1:8787 --json
```

Use `--silent` with `npm run` when parsing JSON. Without it, npm can print its run banner before the CLI output.

## Current Behavior

- Markdown is canonical as raw text in `Y.Text` named `markdown`.
- `publish` creates a local room id and client-side room secret.
- The initial Markdown state is encoded as a Yjs update, encrypted locally, and posted to `POST /rooms/:roomId/updates`.
- Unless `--no-save` is passed, metadata is written to `.mdroom/rooms.json`.
- `export` fetches encrypted records from `GET /rooms/:roomId/updates`, decrypts and replays document records locally, and writes or prints Markdown.
- `status` calls `GET /rooms/:roomId/status`, which returns metadata only: `roomId`, `recordCount`, and `latestSeq`.
- `propose` submits an encrypted whole-document replacement proposal. It does not mutate the accepted Markdown document. Its JSON response is compact and returns proposal ids, status, persona, and hashes, not the full proposed Markdown.
- `proposals` lists decrypted proposal summaries by replaying encrypted room records.
- `show-proposal` decrypts one proposal, including proposed Markdown and timeline events.
- `accept` appends an encrypted canonical document update plus an encrypted proposal-accepted event. Its JSON response is compact and does not echo the accepted Markdown body.
- `reject` appends an encrypted proposal-rejected event without changing canonical Markdown. Its JSON response is compact and does not echo the rejected Markdown body.
- `patch` is a compatibility wrapper around `propose`.
- `--json` emits stable schema identifiers for agent workflows:
  - `mdroom.publish.result.v1`
  - `mdroom.export.result.v1`
  - `mdroom.status.result.v1`
  - `mdroom.propose.result.v1`
  - `mdroom.proposals.result.v1`
  - `mdroom.show-proposal.result.v1`
  - `mdroom.accept.result.v1`
  - `mdroom.reject.result.v1`
  - `mdroom.patch.result.v1`

## Agent Workflow

Agents should prefer JSON output and explicit room references:

```bash
ROOM_JSON=$(npm run --silent cli -- publish ./plan.md --server http://127.0.0.1:8787 --json)
ROOM_URL=$(node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => console.log(JSON.parse(s).room.url));' <<< "$ROOM_JSON")
npm run --silent cli -- status --room "$ROOM_URL" --json
npm run --silent cli -- propose ./plan.next.md --room "$ROOM_URL" --title "Tighten plan" --comment "Proposed by agent workflow." --json
npm run --silent cli -- proposals --room "$ROOM_URL" --json
npm run --silent cli -- export --room "$ROOM_URL" --output ./accepted.md --json
```

When testing the development CLI from another project directory, call the entrypoint directly so `.mdroom/rooms.json` is written in that project instead of this repo:

```bash
/path/to/agent-md-rooms/node_modules/.bin/tsx /path/to/agent-md-rooms/src/cli/bin.ts publish ./plan.md --server http://127.0.0.1:8787 --json
```

Use `--no-save` for stateless automation that should not write `.mdroom/rooms.json`:

```bash
npm run --silent cli -- publish ./plan.md --server http://127.0.0.1:8787 --no-save --json
```

## Room URLs And Tokens

A room URL uses the product shape:

```text
https://example.test/room/:roomId#key=:roomSecret
```

The fragment key is client-side key material. Parsing always separates `serverRoomUrl` from `url`, and `serverRoomUrl` never contains `#key=...`.

The CLI token shape is:

```text
mdroom:v1:<base64url-json>
```

The decoded token contains `v`, `roomId`, `roomSecret`, and `serverUrl`. Treat it like a secret because it grants local decryption access.

`.mdroom/rooms.json` is a local access-token store. It can contain room URLs and tokens with client-side key material so agents can reuse a room without prompting. The directory is ignored by this repo's `.gitignore`; do not commit or share it unless you intentionally want to share room access.

## TODO: Server Integration

The current HTTP spike contract is:

- `POST /rooms/:roomId/updates` appends encrypted payloads and broadcasts them to WebSocket subscribers.
- `GET /rooms/:roomId/updates` replays encrypted append-log records.
- `GET /rooms/:roomId/status` returns non-sensitive room metadata.
- `GET /rooms/:roomId/ws` remains the WebSocket stream for live encrypted updates.

Future production work should split accepted document updates and review suggestions into clearer room namespaces or typed encrypted envelopes. This spike keeps suggestions in the encrypted append log and identifies them by sender id prefix so export can validate sequence continuity while ignoring unaccepted suggestions.

## Fresh Verification Notes

The current fresh local workflow has been verified with:

- `publish --json`
- `status --json`
- `export --json`
- `propose --json`
- `proposals --json`
- `show-proposal --json`
- `accept --json`
- `export --output --json`
- `publish --no-save --json`

The verification also checked that fresh test Markdown phrases were not present as plaintext in `./data` or `.mdroom`.
