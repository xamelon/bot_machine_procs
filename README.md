# bot_procs

Shared bot core: procs framework, Astryx UI, base admin (channels, users, flows,
broadcasts, inbox), platform adapters, agent panel and supervisor.
Specific bots' modules, configuration, databases and secrets belong to their host repos.

## Use as a submodule

```sh
git submodule add -b astryx-base git@github.com:xamelon/bot_machine_procs.git procs
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
The supervisor launches host `src/$main.ts`, not core's standalone entrypoint.

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

The shared integration branch is currently `astryx-base`, not main. Once merged,
change the host's `.gitmodules` branch to main explicitly.

## Development

This repository also runs standalone (`bun install && bun run start`).
Run shared tests with `bun test` here and host-specific integration tests in each
consuming app. Read AGENTS.md and src/procs/PROCS.md before modifying core.
