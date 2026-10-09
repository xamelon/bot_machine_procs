# procs — a file-based FP framework on Bun

> **Working here? Read [`PROCS.md`](./PROCS.md)** — the whole contract in one page.
> This file is the same thing at more length; `architecture.md` is the *why*.

Functions on disk become a registry at runtime. **The file name says what a file
is**; nothing imports anything; the running process is edited in place through a
REPL instead of restarted.

**The framework lives under its own name.** Its modules are `procs/*` on disk, so
they are `ctx.fns.procs.http.dispatch`, `ctx.fns.procs.ui.button`,
`ctx.state.procs.http.routes` — exactly the rule every module follows, and the
reason `log`, `http`, `ui`, `db` are free for an app to use. None of the
framework's names can be shadowed, because they are all under `procs.`: an app
that ships `ui/layout.ts` is *chosen* by `toResponse` over `procs/ui/layout.ts`,
explicitly.

**Why `ctx.fns.x.y()` and never `import`:** an import binds a value into a
closure, so once one module holds another's function, replacing the file changes
nothing — the old code keeps running behind a reference nobody can reach.
Resolving by name at call time makes replacing a function a single assignment
into a tree, and every caller picks it up on its next call. Hot reload is not a
feature bolted on; it is what this rule buys. Break the rule and reload stops
working, quietly.

One framework, many apps: the workspace runtime, the manager, the EHR are all
apps on this. Why it exists as its own package, and what was extracted from
where, is in [`design.md`](./design.md). **The executable example is
[`test-proc/`](./test-proc)** — a small app that uses every feature, and
`src/procs.test.ts` asserts each of them against it. Read the two side by side;
that is the fastest way in.

## An app

```ts
// myapp/src/$main.ts — the whole entry
import { resolve } from "node:path";
import { boot } from "procs";

await boot({ root: resolve(import.meta.dir, "..") });
```

`boot({ root })` scans the framework's own `src`, then the app's, then every
mounted module's, and merges them into one `ctx.fns`. The app is scanned right
after core, so where the two land on the same route or the same name — the app's
`src/$route__GET.ts` over the framework's — the app wins. (A layout is not that
case: the two live under different names and `toResponse` picks, as above.) Add
`package.json` with a `procs.prod` block and you have an app:

```jsonc
{ "procs": { "prod": {                // which modules start, in this order
      "procs/log": {}, "procs/db": { "url": ":memory:" }, "procs/migrate": {},
      "notes": {}, "procs/http": { "port": 0 } } } }   // http is forced last
```

That list is a **start order**, nothing more: a module not named is still mounted,
its functions still callable. What a process is made of — and what it refuses to
even read — is `procs.modules`, below.

## The file-name grammar

| file | is | becomes |
|---|---|---|
| `mod/name.ts` | function | `ctx.fns.mod.name` (nesting continues the name) |
| `mod/Name.ts` (capital) | type | `types.mod.Name`; at src root, a global |
| `$type_Name.ts` | type | the same — **deprecated**, the escape hatch, see the case rule below |
| `mod/$route_<path>_<METHOD>.ts` | route | `METHOD /mod/<path>`; `_`→`/`, `$id`→`:id` |
| `mod/$middleware[_<path>].ts` | middleware | runs under that prefix |
| `mod/State.ts` | the module's state | types `ctx.state.mod` (a slot or a parent of slots, never both) |
| `mod/Session.ts` | fields for the session | merged into the one global `Session` |
| `mod/$start.ts` · `$stop.ts` | lifecycle | boot / shutdown |
| `mod/$config.ts` | config schema | `procs.config.resolve({ module })` |
| `mod/$point_<name>.ts` | declares a point | the point `mod.<name>` exists (`{ family: true }` covers `mod.<name>.*`) |
| `mod/$hook_<point>.ts` | answers a point | `procs.hooks.run` / `procs.hooks.first` — the point must be declared |
| `mod/$migration_<id>.ts` | migration | `procs.migrate.up`, in id order |
| `mod/$cli_<cmd>.ts` | CLI command | `bun script/cli.ts <cmd>` (`_`→`:`) |
| `mod/$script_<n>.js\|mjs\|css` | browser asset | `GET /mod/<n>.<same ext>` — the extension is kept |
| `mod/$style_<n>.css` | Tailwind input | `GET /mod/<n>.css` |
| `mod/$<kind>_<name>.json` | a kind some module owns | wherever its `$loader_<kind>.ts` puts it — its own `ctx.state.<module>` |
| `$main.ts` · `$test.ts` · `*.test.ts` · `*.entry.ts` · `*.d.ts` | skipped | — |
| `mod/$loader_<kind>.ts` | a loader | owns `$<kind>_*` files anywhere on the PATH — a plain fn taking `{ entries }` |

A **function** needs a module to live in: a plain `.ts` file at the src root is
refused by name (`[fns] … a function at the src root has no name`). Named kinds
are fine there — the framework ships `src/$route__GET.ts`, and a root `$hook_`,
`$cli_` or type belongs to the app itself.

**Case is the convention, and it is load-bearing.** A function is a verb in
lower case (`select`, `readPatient`, `loadRoutes`); a type is a noun with a
capital (`Query.ts`, `Patient.ts`). So the two never want the same name — which
matters more than style: macOS is case-insensitive by default, so `db/query.ts`
and `db/Query.ts` are **the same file**, and naming a type onto a function
silently destroys it. `procs.dev.lint` refuses two names differing only in case,
and `$type_Name.ts` remains legal (though deprecated) where the plain name is
genuinely taken — anywhere else it is a lint error, as is `$state_`, and
`lint.ok` gates `dev.def`, `dev.build` and `dev.sync` of a fn or a type.

Almost every `.ts` file here is a function — a route, a hook, a `$start` and a
loader are all `export default function (ctx, session, opts)`. The exceptions are
a type file (a capital-first name, or the deprecated `$type_`) and three kinds
that default-export a plain object instead: `$config.ts` (the schema),
`$point_<name>.ts` (`{ calledWith, answerWith }`, plus `{ family: true }` for a
family) and `$migration_<id>.ts` (`{ up(ctx), down(ctx) }` — ctx only, no session
or opts).

Boot scans the PATH **once** and loads in three phases: **A** every function
(registry complete), **B** the loaders (core by name, then discovered), **C**
every remaining file handed to whoever owns its kind. So a loader runs in a
finished world and calls `ctx.fns.*` like any other code, and no file is
imported twice. A kind nobody owns is reported by name, not ignored.

Directories nest: `src/billing/invoices/create.ts` → `ctx.fns.billing.invoices.create`.

## Every function looks the same

```ts
export default async function (ctx: Context, session: Session | null, opts: { n: number }) { … }
```

and is **called with opts alone** — `ctx.fns.math.fib({ n: 10 })` — because
`ctx.fns` is a Proxy that injects `(ctx, ctx.session)`. The getter reads `this`,
so a **derived** ctx injects itself, and that one mechanism does four jobs:

| derived ctx | gives you |
|---|---|
| a request | the session flows down every call without being passed |
| `procs.repl.eval` | REPL code behaves exactly like a handler |
| `procs.env.fork({ mode })` | a second world — own env, own state, same code |
| a mounted app | it calls itself `app` wherever it was mounted |

**Rules that keep this true:** never import one module from another (call through
`ctx.fns`); keep state on `ctx.state` under **your module's own name** (typed by
your `State.ts`), never in a module-level variable; one file is one function with
one default export.

## Modules — mounting other directories

**A name is a path inside a `src` root** — `src/hs/ui/button.ts` is
`ctx.fns.hs.ui.button` and serves `/hs/ui`, like a package in Java or a namespace
in Clojure. A folder on the PATH and an npm package are *containers*: they
deliver files, they do not name them. A **module** is a namespace that has
module-shaped files (`$config.ts`, `$start.ts`, `$middleware.ts`), at any depth.

A container declares itself in the `procs` block of its own `package.json`
(`proc` and `atomic-workspace.json` are older spellings, still read) — where its
src is, and how it shows itself; never a name:

```jsonc
{ "procs": { "src": "src", "label": "Greeter", "icon": "ph-hand-waving" } }
```

The app composes itself in **its own `package.json`**, one list, one grammar —
the key is a handle for the *container* (what to mount, configure or exclude),
never a namespace; the value says where it comes from. What it ships is named by
the paths inside its `src`, so `@hs/measures/src/measures/bmi.ts` is
`ctx.fns.measures.bmi` whatever the key says:

```jsonc
{ "procs": { "modules": { "billing": {}, "vitals": { "npm": "@hs/measures" },
                          "labs": { "path": "./tools/labs" }, "agent": false, "*": {} } } }
```

`false` excludes at MOUNT time, before the scan, so an excluded module's files
are never opened — that is the boundary; `procs.prod` is only a start order. A
supervised project adds to the same list in `WORKDIR/workspace.json` `modules`
(the key is `modules` there too; an old `plugins` block is still read, never
written). A `{ "path": … }` resolves against `WORKDIR` — the project — not the
app root.

Where to look is `procs.path` in the same `package.json` (`["../libs",
"./modules"]`), and `PROCS_PATH` (colon-separated) overrides it for a run —
there, and only there, `./…` and `../…` are relative to the app and a bare path
to the project it supervises. Tiers decide what is on by default: a container the
host or the project ships is mounted unless its own manifest says
`"optional": true`; everything in the machine's global skill directories is
optional by nature — a catalogue, named one at a time in `workspace.json`.
`"modules": { "*": {} }` mounts the optional ones of the host and the project,
and never reaches the global catalogue.

A module is one concept with two halves: **meta** it declared (label, icon,
config) and **introspection** read off its files — `fns`, `routes`, `hooks`,
`loaders`, `provides` (a service, from `$hook_services.service.<name>.ts`), `tab`,
`skill`. Shipping a file IS the declaration; there is nothing to switch on. It all
lands in `ctx.state.procs.modules`, and `ctx.fns.procs.modules.*` lists, adds,
fetches and removes them — writing `modules` in `workspace.json`.

One exception to "a name is a path": a host that supervises somebody else's
project mounts that tree under a prefix (the workspace calls the project it edits
`app`). Inside such a tree — and only there — `ctx.fns.app` means "myself",
so the same checkout runs in a workspace and in the EHR unchanged.

## HTTP

```
Bun.serve → match → request ctx → middleware* → handler → toResponse
```

Return a value and let `toResponse` decide: a `string` or `{ main, title,
status }` becomes HTML through the layout — an app's own `ui/layout.ts` if it
ships one, otherwise the framework's `procs/ui/layout.ts`; anything else becomes
JSON; a `Response` passes through. For an htmx request it returns **the fragment
plus whatever answers the `procs.ui.chrome` point** — that is how a tab strip or
a patient band stays in step with a swap. `procs.http.dispatch` is the same path
without a socket, which is what makes routes testable with no port.

Every framework asset and route is under `/procs/*`, named by its path like
anything else: the default layout links `/procs/ui/htmx.js`,
`/procs/events/client.js`, `/procs/styles/app.css` (the framework's sheet is
sorted to the front, so an app's cascades over it) and each mounted module's own
`client.js`. The browser driver is not the framework's: it is the `screen`
module (`libs/screen`), whose `/screen/client.js` — posting to `/screen/result`
— is linked only by a host that drives a browser
(`workspace/src/ui/layout.ts`), so `screen.*` needs that host's layout, not this
one. A layout's hardcoded urls are strings nothing type-checks,
so they are pinned to the route table by `src/procs/ui.test.ts` and
`workspace/src/ui.test.ts`.

Middleware may extend the session (`session.user = …`, which then flows
everywhere) or return a `Response` to refuse.

## What a function knows about itself

Functions are objects, so the fn loader hangs metadata on them — our version of a
Clojure var's metadata. `ctx.fns` calls with `this` set to the function, so a
**non-arrow** function can read its own:

```ts
export default function (this: Self, ctx: Context, session: Session | null, opts: {}) {
    return this.meta;   // { name, module, fn, rel, abs, doc }
}
```

From outside, the image answers the same questions — no disk, no grep:

```sh
bun script/repl.ts 'ctx.fns.procs.dev.doc({ name: "procs.db.select" })'   # what is it (C-h f)
bun script/repl.ts 'ctx.fns.procs.dev.doc({ q: "token" })'                # search names + docstrings
bun script/repl.ts 'ctx.fns.procs.dev.where({ name: "procs.hooks.run" })' # where does it live (M-.)
```

The **docstring is the comment the file opens with** — nothing new to write.

## Living with a running process

```sh
bun script/repl.ts 'ctx.fns.math.fib({ n: 30 })'     # eval inside the process
bun script/repl.ts 'await ctx.fns.procs.dev.sync({ rel: "math/fib.ts" })'   # pick a file up
bun script/repl.ts 'ctx.fns.procs.dev.lint({})'      # names and collisions
```

`procs.dev.def` writes, registers and types a function in one call;
`procs.dev.sync` does the same for a file you edited, whatever kind it is;
`procs.repl.load({ name })` hot-swaps one function (`"math.fib"`) or a whole
module (`"math"`). **`POST /procs/repl` is part of the framework, not a debug hatch**, and it
carries three gates: a **JWT this run signs** with `kind: "repl"` (kept 0600 in
`$WORKDIR/.runtime/repl-token`, so it is readable on this machine and nowhere
else), loopback-without-a-proxy, and 403 under `NODE_ENV=production`. The client is
generated per app — `bun script/cli.ts generate:repl` writes `script/repl.ts`,
which reads the port and the token from `$WORKDIR/.runtime` and sends
`Authorization: Bearer …`, so it needs the same `WORKDIR` the server was started
with (`.runtime` belongs to the project a run works on, not to the app root). Those
gates are the only ones: behind a login (`AUTH=on`/`sso`) `/procs/repl` stays
open, because a session is not what protects it.

`procs.dev.watch` (dev only) does the same dispatch on save, but it is not
`sync`: it watches only the app's own `src` — a save inside a mounted module goes
unseen — and skips the lint gate and stylesheet rebuild `sync` runs.

Needs a restart: `$main.ts`, any `$start.ts`/`$stop.ts` (lifecycle has no loader,
so `dev.sync` refuses it), `procs/dev/watch.ts`, and a browser asset inlined by a
text import.

`ctx.fns.procs.dev.build({})` freezes the same scan into static imports and
bundles it into `dist/app.js` — the bundle boots through `boot.apply`, the very
code the dev boot runs.

## Configuration

`$config.ts` declares a schema; `procs.config.resolve({ module })` layers
**defaults < `package.json procs.prod.<module>` < the config on the module's own
record < environment** (`<MODULE>__<KEY>`, or the schema's `env:`), coerces and
validates. That record's config is where the module was asked for —
`procs.modules.<key>` in the app's `package.json`, with a supervised project's
`workspace.json modules.<name>` merged on top — so both outrank `procs.prod`, and
a container's config reaches every module it ships. Modules never read `ctx.env`
directly and never import a `$config`.

## Testing

```ts
import { testCtx } from "procs/test";
const ctx = await testCtx({ root: MY_APP });      // real registry + routes, no server
const res = await ctx.fns.procs.http.dispatch({ url: "/math/10" });
```

`testCtx` also takes `workdir` (the project this ctx supervises) and `env` —
per-ctx, so two test files that each need their own project do not fight over
`process.env`. A test lives beside what it tests: `db/select.test.ts` next to the
function, `db.test.ts` beside the `db/` folder for the module, and only whole-app
tests at the src root. `procs.env.fork` gives a test its own world
inside the same process. A per-module test boots the framework itself (a bare
`testCtx()`); the tests **about composition** — `src/procs.test.ts`, and
`src/procs/modules/add.test.ts` — boot **`test-proc/`** instead of any real app, because a
framework test that knows a real app's content is testing the app.

A browser file (`client.js`) is testable the same way: fetch it over
`http.dispatch`, render the markup with the same `ui.*` functions, run both in a
real DOM (`new Window()` from happy-dom, one per test) — `workspace/src/ui/tabs.test.ts`.

## What this is not

Not a web framework to compete with — the HTTP layer is deliberately thin. Not a
sandbox: mounted code gets the full `ctx`. Not a package manager: one flat
registry per name means one version of everything, and apps depend on the host
rather than on each other. Not multi-tenant: one process is one world, and two
worlds are two processes — or `procs.env.fork`, which is the same idea inside one.
