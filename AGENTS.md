# bot_procs — shared bot core

This repository is the Git submodule used by individual bots. It ships `src/procs/` (framework), Astryx components, `src/bot/` (base admin and runtime), platform adapters, `src/ui/` (admin shell), assets and `supervisor/`. Keep specific bots' modules, configuration, data and credentials out of this repository.

Read `src/procs/AGENTS.md` and `src/procs/PROCS.md` before changes. Infrastructure imports are relative; functions call other modules through `ctx.fns`. One file/default export; state under `ctx.state`.

A host app imports `boot` from `./procs/src/$main` and passes its own root. Discovery composes core src first, then application src. App configuration and start order come from the app's package.json (`procs.prod`); optional containers use `procs.modules`.

Install core dependencies with `bun install` in this repository. A host runs `bun procs/supervisor/start.ts` from its own root. The supervisor launches the host's `src/$main.ts`; database and credentials stay under the host's `.runtime/`, outside editable src.

This core also runs standalone via `bun run start`. Run `bun test` here for shared tests, plus each consuming bot's integration tests before updating its gitlink. Commit shared changes here and application-specific changes in the host repository.

Never weaken supervisor auth, Origin checks, REPL isolation or file path validation.

## UI changes: components first

- Before changing UI markup, search `src/procs/ui/` for an existing component. Read its implementation and an existing usage (the component gallery is `src/procs/ui/$route__GET.ts`) before using it. Do not guess its options or behavior.
- Compose screens through `ctx.fns.procs.ui.*`. Use the existing selector, input, inputGroup, iconButton, collapsible, codeBlock, grid and stack components instead of hand-writing equivalent HTML controls or layout. If no component covers the requirement, explain the gap before adding a custom solution.
- Follow the components' layout contract: form fields belong in `asx-form`; use supported width, size, gap and responsive-column options. Inspect the component and wrapper CSS before adding width overrides. Fix a proven shared-component bug in the component, not with page-specific workarounds.
- Custom CSS is for genuinely screen-specific needs, not recreating component appearance. Keep it beside the screen; do not introduce a second styling API.
- After UI changes, hot-reload and inspect the actual page in a browser. Check alignment, widths, long values and narrow-screen behavior; exercise the interactions changed (selection, disclosure, preview updates, copying). A passing HTML assertion or presence of a CSS class is not a visual or interaction check.
- Report exactly what was checked. If browser verification is unavailable, say so explicitly; do not claim that the UI works or looks correct based only on source or markup tests. Do not use the user as the first visual tester.
