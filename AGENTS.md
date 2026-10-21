# bot_procs

A bot and its framework, in one tree. The base for a new bot: `src/procs/` is the framework, `src/bot/` the bot module, `src/telegram|vk|max/` its channel adapters, `src/ui/` the admin shell, `supervisor/` the process in front of both. Boot is `src/$main.ts`; the test harness is `src/$test.ts`.

Read `src/procs/AGENTS.md` and `src/procs/PROCS.md` before changing code.

Do not add a `procs` package dependency, package alias, submodule or separate framework checkout. Infrastructure imports use relative paths. Application functions call each other through `ctx.fns`, not imports.

Compose an app in the root `package.json` (`procs.prod` is start order). Do not add `workspace.json`. Optional containers live in `modules/`.

`bun run start` runs the supervisor (auth, proxy and recovery worker); `bun run start:runtime` runs only the runtime. Keep the supervisor outside editable `src/`.

## Starting a bot from this tree

The tree is a working bot already: a `welcome` flow, an Echo channel for the sandbox, and the admin at `/bot`. To make it yours, change `procs.prod` in `package.json` (the database url, the port), add your own module next to `src/bot/`, and write its flow in the admin instead of in code — flows are rows, not files.
