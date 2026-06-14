# Deploy Fold

Fold's simplest hosted shape is one public origin serving both the web app and the encrypted append-log API:

```text
https://your-fold.example/room/:roomId#key=...
https://your-fold.example/rooms/:roomId/updates
https://your-fold.example/rooms/:roomId/ws
```

That same-origin shape is the recommended alpha deployment because humans and agents can copy one room reference and use it immediately.

## Requirements

- Node.js 22 or newer.
- A host that can run a long-lived Node process.
- WebSocket support.
- A persistent disk/volume for `data/append-log` if rooms should survive restarts or redeploys.
- HTTPS for any shared deployment so room URLs, invites, and WebSockets are not exposed in transit.

Pure serverless deployments are not the best fit for the current alpha because room sync uses WebSockets and a file-backed append log.

## Generic Node Host

Use these platform settings on any service that supports build and start commands:

```bash
npm install
npm run build
npm start
```

`npm start` runs the hosted Fold process. It serves Next.js pages plus the encrypted append-log API from the same port. Most hosts provide `PORT`; Fold reads it automatically.

Recommended environment:

```bash
FOLD_PUBLIC_URL=https://your-public-fold-url.example
FOLD_DATA_DIR=/persistent/fold/append-log
```

`FOLD_PUBLIC_URL` is the public origin used in copied room links and CLI invites. It should include the scheme and host, without a trailing room path. `FOLD_DATA_DIR` is the append-log storage directory. Without a persistent path, room history may disappear on restart or redeploy.

## Common Host Notes

For hosts such as Railway, Render, Fly.io, Northflank, DigitalOcean App Platform, a VPS, or any container host:

1. Deploy this repository as a Node app.
2. Use `npm run build` as the build command.
3. Use `npm start` as the start command.
4. Ensure WebSockets are enabled.
5. Attach a persistent volume and point `FOLD_DATA_DIR` at it.
6. Set `FOLD_PUBLIC_URL` to the HTTPS URL people open.

Fold also recognizes these provider variables as a convenience when `FOLD_PUBLIC_URL` is not set:

- `RAILWAY_PUBLIC_DOMAIN`
- `RENDER_EXTERNAL_URL`
- `URL`
- `DEPLOY_PRIME_URL`
- `VERCEL_URL`
- `FLY_APP_NAME`

The provider variables are convenience fallbacks, not the contract. `FOLD_PUBLIC_URL` is the portable setting.

## Production-Ish Alpha Checklist

Before sharing a hosted alpha room outside your own machine:

- Serve Fold over HTTPS and make sure reverse proxies forward WebSocket upgrades for `/rooms/:roomId/ws`.
- Attach persistent storage and set `FOLD_DATA_DIR` to that mounted path.
- Back up the append-log volume if room history matters.
- Keep room URLs, `fold:v1:` tokens, copied invites, `.fold/rooms.json`, and deployment logs out of public places.
- Restrict filesystem access to the append-log volume to the service account that runs Fold.
- Remember that the room key is not recoverable by the server. Keep an export or a saved invite/token if losing access would matter.

## Environment Variables

| Variable | Use |
| --- | --- |
| `PORT` | Port for the hosted Node process. Most hosts set this automatically. |
| `FOLD_PUBLIC_URL` | Same-origin public HTTPS URL for both web and sync. Preferred alpha setting. |
| `FOLD_DATA_DIR` | Persistent append-log directory. Defaults are suitable only for local/dev use. |
| `FOLD_PUBLIC_APP_URL` | Public browser app origin for split deployments. |
| `FOLD_PUBLIC_SYNC_URL` | Public append-log HTTP/WebSocket origin for split deployments. |
| `NEXT_PUBLIC_FOLD_SYNC_URL` | Browser-visible sync origin for split deployments. Must be set at web build time. |

## Docker

The repository includes a generic Dockerfile for hosts that prefer containers:

```bash
docker build -t fold .
docker run --rm \
  -p 3000:3000 \
  -e FOLD_PUBLIC_URL=http://localhost:3000 \
  -v "$PWD/data:/data" \
  fold
```

For a real hosted container, set `FOLD_PUBLIC_URL` to the public HTTPS URL and mount `/data` to persistent storage.

For local Docker Compose:

```bash
FOLD_PUBLIC_URL=http://localhost:3000 docker compose up --build
```

The compose file stores append-log data in the `fold-append-log` volume at
`/data/append-log` inside the container.

## Split Web And Sync Hosts

If the web app and append-log sync server are deployed separately, set both origins:

```bash
FOLD_PUBLIC_APP_URL=https://fold-web.example
FOLD_PUBLIC_SYNC_URL=https://fold-sync.example
NEXT_PUBLIC_FOLD_SYNC_URL=https://fold-sync.example
```

The CLI uses `FOLD_PUBLIC_APP_URL` and `FOLD_PUBLIC_SYNC_URL` when creating rooms. The browser uses `NEXT_PUBLIC_FOLD_SYNC_URL` because client-side Next.js code only receives public build-time variables; set it before `npm run build` for the web app.

## Creating The First Hosted Room

From the hosted Fold repository or a machine that can reach the hosted URL:

```bash
FOLD_PUBLIC_URL=https://your-public-fold-url.example \
npm run --silent cli -- room create --alias launch --json
```

Then copy a human invite:

```bash
npm run --silent cli -- room invite launch --for human
```

Or copy an agent handoff:

```bash
npm run --silent cli -- room invite launch --for agent
```

The human invite includes the browser room URL with `#key=...`. The agent invite includes a `fold:v1:` token plus commands for `room add`, `status`, `export`, `propose`, `requests`, `comments`, and `reply`.

## Browser-Created Rooms

When a person creates or opens a room from the hosted web app, Fold defaults the sync URL to the current public origin. That means the copy buttons produce same-origin human and agent handoffs without asking the user to understand separate app and sync URLs.

If the browser detects local-only URLs in a copied invite, treat that invite as development-only. Set `FOLD_PUBLIC_URL` for same-origin hosting or the split URL variables above.

## E2EE Deployment Caveat

The hosted process stores encrypted room payloads and plaintext routing metadata
only. The plaintext routing metadata is `roomId`, append-log `seq`, `senderId`,
record counts, latest sequence, request timing, and network metadata. Markdown
content, project files, proposals, comments, versions, personas, and room keys
remain client-side encrypted and are decrypted by the browser or CLI.

This alpha does not yet include account authentication, ACLs, write authorization,
malicious-server fork/truncation proofs, compaction, key rotation, or link
revocation. Anyone with a valid room URL or token can decrypt the room, and
anyone who can reach the append-log API can currently submit encrypted records
for a known room id.
