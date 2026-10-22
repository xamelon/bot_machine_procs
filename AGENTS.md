# bot_procs — shared bot core

This repository is the Git submodule used by individual bots. It ships `src/procs/` (framework), Astryx components, `src/bot/` (base admin and runtime), platform adapters, `src/ui/` (admin shell), assets and `supervisor/`. Keep specific bots' modules, configuration, data and credentials out of this repository.

Read `src/procs/AGENTS.md` and `src/procs/PROCS.md` before changes. Infrastructure imports are relative; functions call other modules through `ctx.fns`. One file/default export; state under `ctx.state`.

A host app imports `boot` from `./procs/src/$main` and passes its own root. Discovery composes core src first, then application src. App configuration and start order come from the app's package.json (`procs.prod`); optional containers use `procs.modules`.

Install core dependencies with `bun install` in this repository. A host runs `bun procs/supervisor/start.ts` from its own root. The supervisor launches the host's `src/$main.ts`; database and credentials stay under the host's `.runtime/`, outside editable src.

This core also runs standalone via `bun run start`. Run `bun test` here for shared tests, plus each consuming bot's integration tests before updating its gitlink. Commit shared changes here and application-specific changes in the host repository.

Never weaken supervisor auth, Origin checks, REPL isolation or file path validation.
