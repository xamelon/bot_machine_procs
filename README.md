# bot_procs

Shared bot core: procs framework, Astryx UI, base admin (channels, users, flows,
broadcasts, inbox), platform adapters, agent panel and supervisor.
Specific bots' modules, configuration, databases and secrets belong to their host repos.

## Start a new bot with Docker

Copy [examples/new-bot](examples/new-bot/README.md) into your bot repository. It includes compose.yaml, package.json, environment defaults and a sample page. The core comes from a versioned GHCR image; the app is mounted at `/app`, with no submodule or custom bootstrap.

## Use as a submodule

```sh
git submodule add -b main git@github.com:xamelon/bot_machine_procs.git procs
bun install
(cd procs && bun install)
```

Host `src/$main.ts`:

```ts
import { resolve } from "node:path";
import { boot } from "../procs/src/$main";
await boot({ root: resolve(import.meta.dir, "..") });
```

Host package.json scripts: `start: bun procs/supervisor/start.ts`,
`start:runtime: bun 'src/$main.ts'`. Run from the host root so its `.env` applies.
The supervisor launches the core's `src/$main.ts` with the host root in `APP_ROOT`; the host bootstrap is only needed for direct legacy runtime commands.

Host `procs.prod` supplies lifecycle order and configuration, for example:

```json
{
  "procs": { "prod": {
    "procs/log": {},
    "procs/db": { "url": ".runtime/app.sqlite" },
    "procs/migrate": {},
    "bot": {},
    "procs/repl": {},
    "procs/styles": {},
    "procs/http": { "port": 4100 }
  } }
}
```

Core `src` is discovered first, host `src` second. Add business-specific namespaces
in host `src/`; keep general admin improvements here. Host tests can wrap
`procs/src/$test.testCtx({root: hostRoot})`. No server is started by testCtx.

For an existing bot checkout:

```sh
git submodule update --init --recursive
bun install
(cd procs && bun install)
bun run start
```

## Updates

Each host pins a tested commit. New core commits do not silently change running
bots. Commit and push shared changes here first. In each host, ensure the submodule
is clean, then update, install dependencies, test and commit the gitlink:

```sh
git -C procs status --short   # stop if dirty; preserve/commit local work first
git submodule update --remote procs
(cd procs && bun install)
bun run test
# Restart runtime/supervisor and check host routes before committing.
git add procs
git commit -m 'Update shared bot core'
```

The shared integration branch is `main`. Hosts track it in `.gitmodules`, while
each host's committed gitlink pins the exact version tested for that bot.

## Message formatting

Node/outbox texts use Markdown by default for MAX and VK. Prefer a small portable
subset: paragraphs and line breaks, headings, **bold**, *italic*, links and lists.
Avoid tables and complex layouts. Button labels are plain text.

- MAX sends the source with `format: "markdown"` (explicit `format: "html"` is preserved).
- VK renders Markdown as readable plain text: emphasis markers disappear, list
  markers remain, and `[label](url)` becomes `label — url`.
- Set payload `format: "plain"` to send literal text on either platform.
- Other platforms are unchanged. Source texts in flows and outbox are not rewritten.

Conversion lives in `bot.formatMessage` and runs in the platform adapters, so it
also covers broadcasts and manual sends. The editor still shows source Markdown;
there is no per-platform preview yet.

## MAX photos

Photo attachments (`{ type: "photo", url }` or `{ type: "photo", ref }`) are
converted to MAX `image` attachments. Local editor uploads are sent as multipart
`data` to the URL from `POST /uploads?type=image`; the returned token is cached
per connection in `bot_media_uploads`. Public HTTP(S) image URLs can be sent
directly without uploading. Photos, text and the inline keyboard stay in one
message; more than 12 images produce an explicit error rather than being dropped.
MAX format restrictions still apply (notably WebP is not listed as supported).

If MAX responds `attachment.not.ready`, the outbox retries after 5–60 seconds
with increasing delays, reusing the cached token. Upload errors do not populate
the cache. TLS certificate checks remain enabled for both API and upload calls.

## Development

This repository also runs standalone (`bun install && bun run start`).
Run shared tests with `bun test` here and host-specific integration tests in each
consuming app. Read AGENTS.md and src/procs/PROCS.md before modifying core.
