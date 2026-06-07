# mdroom CLI Skeleton

This CLI pass is still intentionally bounded, but `publish`, `export`, `status`, and `patch` now talk to the encrypted append-log HTTP API from the E2EE spike.

## Commands

```bash
mdroom publish <file.md> [--server <url>] [--json] [--no-save]
mdroom export --room <url-or-token> [--output <file>] [--json]
mdroom status --room <url-or-token> [--json]
mdroom patch <file.md> --room <url-or-token> [--summary <text>] [--json]
```

During development, run the CLI through:

```bash
npm run cli -- publish README.md --json
```

## Current Behavior

- Markdown is canonical as raw text in `Y.Text` named `markdown`.
- `publish` creates a local room id and client-side room secret.
- The initial Markdown state is encoded as a Yjs update, encrypted locally, and posted to `POST /rooms/:roomId/updates`.
- Unless `--no-save` is passed, metadata is written to `.mdroom/rooms.json`.
- `export` fetches encrypted records from `GET /rooms/:roomId/updates`, decrypts and replays document records locally, and writes or prints Markdown.
- `status` calls `GET /rooms/:roomId/status`, which returns metadata only: `roomId`, `recordCount`, and `latestSeq`.
- `patch` submits an encrypted whole-document replacement suggestion. It does not mutate the accepted Markdown document.
- `--json` emits stable schema identifiers for agent workflows:
  - `mdroom.publish.result.v1`
  - `mdroom.export.result.v1`
  - `mdroom.status.result.v1`
  - `mdroom.patch.result.v1`

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
