# procs — everything you need to work in this framework

A file-based functional framework on Bun. **The file name says what a file is**,
**a name is its path**, and **the running process is edited, not restarted**.
Three kinds of thing exist: namespaces (directories), functions (files), types
(capitalised files). No classes, no DI, no decorators.

## The three rules

1. **Never import another module.** Call it: `ctx.fns.notes.add({ text })`. Names
   resolve at call time — that is what makes hot reload work. An import binds the
   old function into a closure forever.
2. **All state on `ctx.state`, under your module's own name** (`ctx.state.notes`),
   never in a module-level variable.
3. **One file = one function = one `export default`.**

## Every function looks the same

```ts
// notes/add.ts  →  ctx.fns.notes.add
export default async function (ctx: Context, session: Session | null, opts: { text: string }) {
    ctx.fns.procs.db.insert({ into: "notes", values: { text: opts.text } });
    return { ok: true };
}
```

Called with **opts alone** — `ctx.fns.notes.add({ text: "hi" })` — because
`ctx.fns` is a Proxy that injects `(ctx, ctx.session)`. The getter reads `this`,
so a **derived** ctx injects itself. That one mechanism does four jobs:

| derived ctx | gives you |
|---|---|
| a request | the session flows down every call without being passed |
| `procs.repl.eval` | REPL code behaves exactly like a handler |
| `procs.env.fork({ mode })` | a second world — own env, own state, same code |
| a tree mounted under a prefix | it calls itself `app` wherever it landed |

## The naming grammar

A name is the path inside a `src` root: `hs/ui/button.ts` → `ctx.fns.hs.ui.button`,
url `/hs/ui`. The folder or npm package that delivered the file names nothing.

| file | is | becomes |
|---|---|---|
| `mod/doThing.ts` | function (a **verb**, lower case) | `ctx.fns.mod.doThing` |
| `mod/Thing.ts` | type (a **noun**, capitalised) | `types.mod.Thing`; at src root, a global |
| `mod/$type_Thing.ts` | the same — **deprecated** | legal only where `Thing.ts` would collide with a function |
| `mod/State.ts` | the module's state | types `ctx.state.mod` |
| `mod/Session.ts` | session fields | merged into the global `Session` |
| `mod/$route_<path>_<METHOD>.ts` | route | `METHOD /mod/<path>`: `_`→`/`, a `$x` segment→`:x`. `chart/$route_$id_labs_GET.ts` → `GET /chart/:id/labs`; `chart/$route__GET.ts` → `GET /chart` |
| `mod/$middleware[_<path>].ts` | middleware | runs under that prefix |
| `mod/$config.ts` | config schema | `procs.config.resolve({ module: "mod" })` |
| `mod/$start.ts` · `$stop.ts` | lifecycle | boot / shutdown, in `procs.prod` order |
| `mod/$point_<name>.ts` | declares an extension point | the point `mod.<name>`; `{ family: true }` covers `mod.<name>.*` |
| `mod/$hook_<point>.ts` | answers one | `procs.hooks.run/first` |
| `mod/$migration_<id>.ts` | migration | `procs.migrate.up`, in id order |
| `mod/$cli_<cmd>.ts` | CLI command | `bun script/cli.ts <cmd>` (`_`→`:`) |
| `mod/$script_<n>.js\|mjs\|css` · `$style_<n>.css` | browser asset · Tailwind input | `GET /mod/<n>.<same ext>` · `GET /mod/<n>.css` |
| `mod/$loader_<kind>.ts` | a loader | owns every `$<kind>_*` file anywhere |
| `mod/$<kind>_<name>.json` | a file some module owns | whatever its loader does with it |
| `$main.ts` · `$test.ts` · `*.test.ts` · `*.entry.ts` · `*.d.ts` | skipped | — |

`$` means **the scan parses this name instead of taking the file for a function**.
Most kinds are then handed to a loader (`ctx.state.procs.boot.loaders`: `fn
config hook migration cli route middleware script style point`); `$start`/`$stop`
have none — `procs.lifecycle` runs them in turn — and `$main`/`$test` are
reserved and skipped. A type is never loaded at all, so it needs no `$` — its
capital is enough, *because* functions are verbs and types are nouns.

**Case matters twice.** macOS is case-insensitive: `query.ts` and `Query.ts` are
one file — so a noun-named function collides with its own type and one of them is
silently destroyed. That is why the framework's own `db.query` was renamed
`db.select`: name functions with verbs (`select`, `readPatient`, `loadRoutes`) and
the collision cannot happen. `procs.dev.lint` refuses two names differing only in case, a function
that is also a namespace, an invalid identifier, a hook whose point nobody
declares, a module that is both a state slot and the parent of slots, and the
deprecated `$state_` spelling. `$type_Thing.ts` is refused the same way **unless
`Thing.ts` is genuinely taken** — that one case is what the escape hatch is for.
`lint.ok` gates `dev.def`, `dev.build` and `dev.sync` of a fn or a type.

**Helper files are still functions.** A plain `.ts` anywhere under `src/` is
loaded as a function unless its name is one of the `$...` forms above, a type, or
a skipped file. Route folders are often kebab-case (`pill-tracker/`), because
route paths may contain dashes, but a helper in that folder like
`pill-tracker/page.ts` would become `ctx.fns.pill-tracker.page` — not a valid JS
identifier — and hot reload will reject the whole change. Keep helpers in
identifier-named folders (`pills/shared.ts`, `lib/pills.ts`) or make the route
folder itself an identifier. Kebab route folders should contain only `$route_*`
and other `$...` files.

## The framework is a module tree: `procs.*`

Core modules live under `src/procs/`, so they are `ctx.fns.procs.http.dispatch`,
`ctx.state.procs.http.routes`, `types.procs.db.Query`, `GET /procs/modules`. The
short names (`log`, `http`, `ui`, `db`, `config`) are free for your app, and none
of the framework's names can be shadowed — every one of them is under `procs.`.
Two files that *do* land on the same name or route override each other, last in
scan order winning (below). The layout is not that case: `ui/layout.ts` and
`procs/ui/layout.ts` are different names, and `toResponse` *chooses* the app's.

The same rule names its browser assets. The default layout links
`/procs/ui/htmx.js`, the sheets in `ctx.state.procs.styles`,
`/procs/events/client.js`, and each mounted module's own `client.js` — the
framework's is `events/client.js` again, so it lands twice.
(The browser driver that used to live here is the `screen` module now,
`libs/screen`: a host that drives a browser mounts it and links
`/screen/client.js` itself — `workspace/src/ui/layout.ts`.) The framework's
sheet sorts to the
front of `ctx.state.procs.styles`, so a module's or an app's cascades over it; a
layout's hardcoded urls are pinned to the route table by `src/procs/ui.test.ts`.

Namespaces: `auth boot cli config db dev env events generate hooks http lifecycle
log migrate modules project repl styles ui`.

## An app

```ts
// myapp/src/$main.ts — the whole entry
import { resolve } from "node:path";
import { boot } from "procs";
await boot({ root: resolve(import.meta.dir, "..") });
```

```jsonc
// myapp/package.json
{ "procs": {
    "prod":    { "procs/log": {}, "procs/db": { "url": ".runtime/app.sqlite" },
                 "procs/migrate": {}, "notes": {}, "procs/http": { "port": 3000 } },
    "modules": { "billing": {},                        // a folder on PROCS_PATH
                 "vitals":  { "npm": "@hs/measures" }, // an installed package
                 "labs":    { "path": "./tools/labs" },// a folder, resolved against WORKDIR
                 "agent":   false,                     // excluded: files never opened
                 "*":       {} } } }                   // the host's library and the project's,
                                                       // never the machine's catalogue
```

- **`procs.prod`** = what **starts**, in this order (`http` forced last). A `$start`
  may return state, merged into `ctx.state.<module>`; `$stop` gets it back. A
  `$start` that **throws** is complained about (`lifecycle.failed`, then one
  `lifecycle.degraded` at the end, and the /plugins page) and skipped — one
  unconfigured module does not cost the host its other pages. `procs/*` and
  anything with `"required": true` in its block still roll the boot back.
- **`procs.modules`** = what the process is **made of**. `false` is applied before
  the scan, so an excluded module's files are never even read. *Mounting is the
  boundary — "not started" is not.*
- **`procs.path`** in the same `package.json` = where this host looks for modules,
  in order (`["../libs", "./modules"]`); `PROCS_PATH` (colon-separated) overrides
  it for a run. Each entry is a folder whose subfolders are containers. A container declares itself in the `procs`
  block of its own `package.json` (`{ "src": "src", "label": "…" }`) — never a name.
  (`proc` and `atomic-workspace.json` are older spellings of the same block, still read.)
  A container is mounted unless its manifest says `"optional": true` — then it waits
  to be named in the composition list, or covered by `"*"`. Everything found in a
  global skill directory is optional by nature, and `"*"` never reaches it.
- **A key in `procs.modules` is a handle for the container** (what to mount, configure
  or exclude), **not a namespace.** The names of what a container ships come from the
  paths inside its `src`: `@hs/measures/src/measures/bmi.ts` → `ctx.fns.measures.bmi`,
  whatever the package or the key is called. A container may ship several namespaces.
  A dependency **without** a `procs` block is an ordinary library that nobody mounts.
- **`workspace.json`** in `WORKDIR` (the project a host supervises) may add to the
  same `modules` list and pass config — that is the workspace case; an app that
  supervises nothing needs only its `package.json`.

Scan order = the framework's own `src` → the app's `src` → a supervised project
mounted in-process under a prefix → npm packages → `procs.path`/`PROCS_PATH`
folders → `{ "path": … }` and `{ "git": … }` entries. The app is scanned after
core, so where the two would land on the same route or the same name, the app's
file wins — later in the order wins, and a `path`/`git` module is last.

## Loaders — how a kind becomes live

A loader is an ordinary function handed **all** files of its kind at once:

```ts
// questionnaire/$loader_qr.ts — "I own $qr_<name>.json"
export default async function (ctx: Context, _s: Session | null, opts: { entries: any[] }) {
    for (const e of opts.entries) {
        const resource = await Bun.file(e.abs).json();
        if (resource.resourceType !== "Questionnaire") throw new Error(`${e.rel}: not a Questionnaire`);
        ((ctx.state.questionnaire ??= {}).items ??= {})[`${e.module ?? ""}:${e.name}`] =
            { name: e.name, module: e.module ?? "", rel: e.projectRel ?? e.rel, abs: e.abs, resource };
    }
}
```

A scan entry carries `{ kind, name, rel, abs, module, namespace, projectRel }`:
**`module`** is the dotted name the file landed under (it begins with the prefix a
host mounted the tree under), `rel` is that namespaced path, **`projectRel`** the
path inside the project that shipped it. So key and tag by `module`, keep
`projectRel` as the path a caller will name, and hand a caller **its own** copy by
matching `ctx.namespace` (the prefix of whoever is asking) against `module` —
equal, or a dotted prefix of it. Never strip a namespace off `rel`: `rel` is
slashed, `module` is dotted. One file re-collected by `dev.sync` or the watcher
arrives as a bare `classify` entry with neither `module` nor `projectRel` — hence
the `??`.

Boot = **one scan, three phases**: (A) import every `.ts` and register plain
functions — the registry is complete before anything else runs; (B) register
loaders (core by name, then discovered); (C) hand every remaining file to whoever
owns its kind. Hot reload and the production build enter the same table:
`boot.apply(ctx, entries, modules)` is the only implementation.

## Functions know themselves

The loader hangs `{ name, module, fn, rel, abs, doc }` on the function object;
`ctx.fns` calls with `this` = that function. The **docstring is the comment the
file opens with**.

```ts
export default function (this: Self, ctx: Context, s: Session | null, o: {}) { return this.meta; }
```

```sh
bun script/repl.ts 'ctx.fns.procs.dev.doc({ name: "procs.db.select" })'   # C-h f
bun script/repl.ts 'ctx.fns.procs.dev.doc({ q: "token" })'                # search
bun script/repl.ts 'ctx.fns.procs.dev.where({ name: "procs.hooks.run" })' # M-. → { name, module, rel, abs }
```

## HTTP

```
Bun.serve → match → request ctx → middleware* → handler → toResponse
```

Return a value: a `string` or `{ main, title?, status? }` becomes HTML through the
layout; anything else becomes JSON; a `Response` passes through. **An `hx-request` header is what switches the answer from a full document to a
fragment** — the same handler, the same return value. For an htmx request you get
**the fragment plus whatever answers the `procs.ui.chrome` point**
(tab strip, patient band) with `hx-swap-oob`. `procs.http.dispatch({ method?, url, body?, headers? })` is the same path without
a socket and returns a real `Response` — that is how routes are tested.

Middleware may extend the session (`session.user = …`, which then flows
everywhere) or return a `Response` to refuse.

## Config

`$config.ts` declares a schema; `procs.config.resolve({ module })` layers
**defaults < `package.json procs.prod.<module>` < the config on the module's own
record < env** (`<MODULE>__<KEY>`, or the schema's `env:`), coerces and validates.
That record's config is where the module was asked for — `procs.modules.<key>` in
the app's `package.json`, with `modules.<name>` from a supervised project's
`workspace.json` merged on top — so both outrank `procs.prod`. The key names a
container, and its config reaches every module that container ships. Modules
never read `ctx.env` and never import a `$config`.

## Logging

One logger, one shape. `procs.log.{debug,info,warn,error}({ event, msg, ...attrs })`
writes an OTel record (`Timestamp`, `SeverityNumber`, `Body`, `Attributes`,
`Resource`, `TraceId`); `LOG_FORMAT=json` for machines, `pretty` for you,
`LOG_LEVEL` gates. The framework logs its own work the same way — `load.*`,
`lifecycle.*`, `migrate.*`, `http.request`, `reload.fn` — so one level and one
format govern everything.

**Context comes from the session, never from the caller.** A request mints
`session.trace = { id, started, route }` once, and because the session flows down
every `ctx.fns.*` call, every line written anywhere inside that request carries
`trace.id` — and under `LOG_FORMAT=json` `http.route` (the pattern, `/chart/:id`),
`http.url`, `http.method` and `user.id` as well; `pretty`, the default, prints
the trace id and your own attrs only. Nobody passes a request id, and nobody can
forget to.

```ts
ctx.fns.procs.log.info({ event: "note.added", msg: id, "db.rows": 1 });
```

Attribute names are dotted and namespaced by what they describe (`http.*`, `db.*`,
`user.*`); `event` is `<module>.<thing that happened>`.

## The REPL — the primary tool

```sh
bun script/repl.ts 'ctx.fns.math.fib({ n: 30 })'                    # eval in the process
bun script/repl.ts 'await ctx.fns.procs.dev.sync({ rel: "math/fib.ts" })'  # pick a file up
bun script/repl.ts 'ctx.fns.procs.dev.lint({})'                     # names and collisions
bun script/cli.ts generate:repl                                     # write script/repl.ts into an app
```

`POST /procs/repl` is gated three ways: a **JWT this run signed** (`kind: "repl"`,
kept 0600 in `$WORKDIR/.runtime/repl-token`), **loopback without a proxy**, and 403
under `NODE_ENV=production`. A run writes its port and token into the project it
works on, so `script/repl.ts` needs the **same `WORKDIR` the server was started
with** — without it, `No ./.runtime/port`.

Three ways to get an edit into the process, in order of how much you have
already done yourself: **`procs.dev.def`** writes the file, registers it and
regenerates types (use it to create a function from the REPL);
**`procs.dev.sync({ rel })`** picks up a file you edited yourself, whatever kind
it is; **`procs.repl.load({ name })`** re-imports and swaps one function
(`"math.fib"`) or a whole module (`"math"`). `procs.dev.watch` (dev only) does the
same dispatch on every save and keeps a per-file error board that every REPL
answer carries — but it is not `sync`: it watches only the **app's own `src`** (a
save inside a mounted module is not seen), and it skips the lint gate and the
stylesheet rebuild `sync` runs. Prefer `def`/`sync`; the watcher is the safety net.

**Needs a restart:** `$main.ts`, any `$start.ts`/`$stop.ts` (lifecycle files have
no loader — `dev.sync` refuses them), `procs/dev/watch.ts`, and a browser asset
inlined by a text import. Everything else reloads.

## Building for production

`procs.dev.build({})` freezes the scan into static imports and bundles everything
into one file: `bun dist/app.js` runs anywhere, with no scan and no dynamic
import. Two consequences worth knowing:

- **A bundle contains what was mounted when it was built.** An optional module a
  project asks for later is not in it — its code was never bundled.
- **A bundle can still mount at runtime** (the project a workspace supervises):
  `boot.load` adds what it finds to the baked list instead of replacing it.

## Testing

```ts
import { testCtx } from "procs/test";
const ctx = await testCtx({ root: MY_APP });          // real registry + routes, no server
const res = await ctx.fns.procs.http.dispatch({ url: "/math/10" });
```

`testCtx` also takes `workdir` (the project this ctx supervises) and `env` —
per-ctx, because two test files that each need their own project would otherwise
fight over `process.env` and the loser mounts the wrong thing.

**A test lives beside what it tests** — `db/select.test.ts` next to the function,
`db.test.ts` next to the `db/` folder for the module as a whole, and only a test
about the *whole app* sits at the src root (`procs.test.ts`, `typecheck.test.ts`). `procs.env.fork` gives a test its own
world inside the same process. `procs.dev.typecheck` runs `tsc` over the project —
the generated `src/ctx_ns.d.ts` (from `procs.dev.genTypes`) is what types
`ctx.fns`, `ctx.state` and `Session`.

A browser file (`client.js`) is testable too: fetch it over `http.dispatch`, build
the markup with the same `ui.*` functions, and run the two together in a real DOM
(`new Window()` from happy-dom, one per test, nothing registered globally) — see
`workspace/src/ui/tabs.test.ts`, which drives `page.readScreen`'s reader over the
rendered tab strip.

## Where the rest is

This file is the whole contract — an agent needs nothing else to work here.
**Why** it is shaped this way (the Clojure/Java lineage, the bootstrap phases, the
decisions and what they cost) is in `architecture.md`; what was extracted from
where, and what is left to port, is in `design.md`; the executable example is
`test-proc/`, asserted feature by feature in `src/procs.test.ts`.

## What this is not

Not a web framework to compete with — the HTTP layer is deliberately thin. Not a
sandbox: mounted code gets the full `ctx`. Not a package manager: one flat name
means one version of everything. Not multi-tenant: one process is one world, and
two worlds are two processes — or `env.fork`, which is the same idea inside one.
