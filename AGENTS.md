# bot_procs

Bot engine on the `procs` framework. Read [`PROCS.md`](./PROCS.md) for the full contract. This file is what to follow in this repo.

Do not add `workspace.json`. This process is one bot, not a host supervising somebody else's project. Compose it in `package.json` (`procs.prod`, `procs.modules`, `procs.path`). `libs/screen` is the browser driver; mount it, do not copy it into `src/`.

## Rules

The file name is the registration. Nothing imports a neighbour. Call `ctx.fns.mod.fn(opts)`. An import binds the old function into a closure and hot reload stops working, quietly.

Framework modules live under `procs/`, so they are `ctx.fns.procs.*`. `log`, `http`, `ui` and `db` are free for the app. An app `ui/layout.ts` does not shadow `procs/ui/layout.ts`; `toResponse` chooses the app one.

State lives on `ctx.state` under the module's own name, never in a module-level variable. One file, one default export.

## Boot

```ts
import { resolve } from "node:path";
import { boot } from "procs";

await boot({ root: resolve(import.meta.dir, "..") });
```

`boot` scans the framework `src`, then the app `src`, then mounted modules. The app is scanned after core, so the same route or function name in the app wins. A module missing from `procs.prod` is still mounted and callable. `procs.prod` is only the start order; `http` is forced last.

```jsonc
{ "procs": {
    "prod": {
      "procs/log": {},
      "procs/db": { "url": ".runtime/bot.sqlite" },
      "procs/migrate": {},
      "procs/http": { "port": 3000 }
    },
    "path": ["./libs"],
    "modules": { "screen": {} }
} }
```

A container declares itself in its own `package.json` (`{ "procs": { "src": "src", "label": "…" } }`). The key in `procs.modules` is a handle for that container, not a namespace. Names come from paths inside its `src`. `false` excludes a container before the scan. `procs.path` is where those containers are looked up. `PROCS_PATH` overrides it for one run.

## File names

| file | is | becomes |
|---|---|---|
| `mod/name.ts` | function | `ctx.fns.mod.name` |
| `mod/Name.ts` | type | `types.mod.Name` |
| `mod/$route_<path>_<METHOD>.ts` | route | `METHOD /mod/<path>`; `_` → `/`, `$id` → `:id` |
| `mod/$middleware[_<path>].ts` | middleware | runs under that prefix |
| `mod/State.ts` | module state | types `ctx.state.mod` |
| `mod/Session.ts` | session fields | merged into `Session` |
| `mod/$start.ts` · `$stop.ts` | lifecycle | boot / shutdown. A change needs a restart |
| `mod/$config.ts` | config schema | `procs.config.resolve({ module })` |
| `mod/$point_<name>.ts` | extension point | `mod.<name>` |
| `mod/$hook_<point>.ts` | answer | `procs.hooks.run` / `first`. The point must exist |
| `mod/$migration_<id>.ts` | migration | `procs.migrate.up`, id order. Never rewrite an applied one |
| `mod/$cli_<cmd>.ts` | CLI | `bun script/cli.ts <cmd>` |
| `mod/$app_<name>.json` | admin card | menu item, not a route. Collected by its loader |
| `mod/$script_<n>.js` · `$style_<n>.css` | asset | `GET /mod/<n>.<ext>` |
| `mod/$loader_<kind>.ts` | loader | owns `$<kind>_*` files |
| `$main.ts` · `$test.ts` · `*.test.ts` · `*.d.ts` | skipped | — |

A function needs a module. A plain `.ts` at the src root has no name and is refused. Functions are lower-case verbs, types are capital nouns. macOS is case-insensitive: `query.ts` and `Query.ts` are one file. `procs.dev.lint` refuses that, and `lint.ok` gates `dev.def`, `dev.sync` and `dev.build`.

Almost every `.ts` file is `export default function (ctx, session, opts)`. Exceptions that default-export an object: `$config.ts`, `$point_*.ts`, `$migration_*.ts` (`{ up(ctx), down(ctx) }`).

Call with opts only: `ctx.fns.math.fib({ n: 10 })`. The proxy injects `(ctx, ctx.session)`, so a request session, `procs.repl.eval` and `procs.env.fork` all flow without being passed.

## HTTP

`Bun.serve` → match → request ctx → middleware → handler → `toResponse`.

A string or `{ main, title, status }` becomes HTML through the layout. Anything else becomes JSON. A `Response` passes through. An `hx-request` header returns the fragment plus whatever answers `procs.ui.chrome`. `procs.http.dispatch` is the same path with no socket; use it in tests.

Framework assets are `/procs/ui/htmx.js`, `/procs/events/client.js`, `/procs/styles/app.css`. The browser driver is `libs/screen`: `GET /screen/client.js`, results at `POST /screen/result`. A layout that should be drivable links that script. Markers are `data-*` from `procs.ui.attr`, never CSS selectors.

Middleware may set `session.user` or return a `Response` to refuse.

## Admin menu

A menu item is `$app_<name>.json`, not a route and not an edit to a shared list. Core and the bot both ship them. The loader collects every one. The same name in the bot, scanned later, overrides the core card. A route without a card is not a menu item. One card per section, not per screen.

```json
{ "title": "Flows", "icon": "ph-share-network", "group": "Bot", "permission": "bot.view", "order": 20, "open": "/bot/flows" }
```

Check `permission` on the link and on the route. Hiding a link is not authorization.

## Live process

```sh
bun script/repl.ts 'ctx.fns.math.fib({ n: 30 })'
bun script/repl.ts 'await ctx.fns.procs.dev.sync({ rel: "math/fib.ts" })'
bun script/repl.ts 'ctx.fns.procs.dev.lint({})'
```

`procs.dev.def` writes a file, lints, registers and regenerates types. `procs.dev.sync` picks up a file you edited. `procs.repl.load({ name })` swaps one function or a module. Prefer `def` / `sync`. The watcher is the safety net: it watches only this app's `src`, not a mounted package, and it skips the lint gate.

`POST /procs/repl` is gated by a JWT this run signs (`kind: "repl"`, mode 0600 in `.runtime/repl-token`), loopback, and 403 in production. A login session does not protect it.

Needs a restart: `$main.ts`, `$start.ts`, `$stop.ts`, `procs/dev/watch.ts`, and a browser asset inlined by a text import.

## Config

`$config.ts` declares the schema. `procs.config.resolve({ module })` layers defaults, then `package.json` `procs.prod.<module>`, then the module record in `procs.modules`, then env (`<MODULE>__<KEY>` or the schema's `env:`). Modules do not read `ctx.env` and do not import a `$config`.

## Tests

A test sits next to what it tests. `procs.env.fork` gives it a world of its own. `testCtx({ root })` builds the registry and routes without a server. Hit routes through `procs.http.dispatch`.

## What this is not

Not a sandbox: mounted code gets the full `ctx`. Not a package manager: one name is one version. Not multi-tenant: one process is one bot. Many bots are many processes.
