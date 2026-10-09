---
name: procs
description: The framework everything here is written in — a file on disk becomes a callable function, a route, a page; the process is edited live through the REPL instead of restarted. Read it before writing any file in a project's src/, before wondering why an edit did nothing, and before naming a folder.
---

# procs — write a file, call it, without restarting

The whole idea: **a path inside `src/` is a name.** `src/vitals/latest.ts` is
`ctx.fns.vitals.latest`. Nothing imports anything; the running process resolves
names at call time, which is what makes an edit land without a restart.

The full contract is `procs/PROCS.md` — this is what you need to *do* something.

## One file, one function, always the same shape

```ts
// src/vitals/latest.ts  →  ctx.fns.vitals.latest({ patient })
export default async function (ctx: Context, session: Session | null, opts: { patient: string }) {
    const rows = await ctx.fns.record.listResults({ patient: opts.patient, count: 1 });
    return rows[0] ?? null;
}
```

It is **called with opts alone** — `ctx.fns.vitals.latest({ patient: "seed-anna" })`
— because `ctx.fns` injects `(ctx, session)` for you.

Three rules that keep the live process working, and break quietly when ignored:

- **Never `import` another module** — call `ctx.fns.<ns>.<fn>({...})`. An import
  binds the old function into a closure, so replacing the file changes nothing
  and the process keeps running code you have deleted.
- **Keep state on `ctx.state.<your module>`**, never in a module-level variable:
  a reload makes a new module object and the variable resets under you.
- **A verb in lower case is a function; a capitalised name is a type.**
  `Query.ts` is `types.<mod>.Query`. macOS is case-insensitive, so
  `db/query.ts` and `db/Query.ts` are the SAME FILE — naming a type onto a
  function silently destroys it.

## The file name says what the file is

| file | is | becomes |
|---|---|---|
| `mod/name.ts` | a function | `ctx.fns.mod.name` |
| `mod/Name.ts` | a type | `types.mod.Name` |
| `mod/$route_<path>_<METHOD>.ts` | a route | `METHOD /mod/<path>`; `_`→`/`, `$id`→`:id` |
| `mod/$middleware[_<path>].ts` | middleware | runs under that prefix |
| `mod/State.ts` | the module's state | types `ctx.state.mod` |
| `mod/$start.ts` · `$stop.ts` | lifecycle | boot / shutdown — **needs a restart to take** |
| `mod/$config.ts` | config | `procs.config.resolve({ module })` |
| `mod/$hook_<point>.ts` | answers a point | `procs.hooks.run` / `.first` |
| `mod/$cli_<cmd>.ts` | a CLI command | `bun script/cli.ts <cmd>` |
| `$<kind>_<name>.json` | a kind some module owns | `$app_`, `$seed_`, `$chart_`, `$viewdef_`, `$qr_`, `$flow_` |

A folder is a name, so it must be a legal identifier: `src/pill-tracker/x.ts`
would be `ctx.fns.pill-tracker.x`, which is not one. Use `src/pills/`.

## Calling anything, right now

```sh
.workspace/repl 'ctx.fns.services.status({})'                 # the process answers about itself
.workspace/repl 'await ctx.fns.app.vitals.latest({ patient: "seed-anna" })'
.workspace/repl 'await ctx.fns.aidbox.request({ path: "/fhir/Patient?_count=1" })'
```

The body is TypeScript that runs **inside the process**: `ctx` is in scope, the
last expression is the answer, `print(...)` is captured, nothing restarts. Reach
for it before re-reading code or adding a `console.log` — it answers "what does
the process actually hold right now", which reading a file cannot.

Multi-line goes on stdin:

```sh
.workspace/repl <<'EOF'
const patients = await ctx.fns.ehr.search({ q: "" });
print(patients.length + " patients");
patients.slice(0, 3)
EOF
```

## Finding what already exists

There are hundreds of functions here. Search them; do not read source to find
out what exists, and never write a second version of something you did not
search for.

```sh
.workspace/repl 'ctx.fns.procs.dev.doc({ q: "allergy" })'          # names + docstrings
.workspace/repl 'ctx.fns.procs.dev.doc({ name: "record.listAllergies" })'   # what does this one do
.workspace/repl 'ctx.fns.procs.dev.where({ name: "record.listAllergies" })' # which file
.workspace/repl 'Object.keys(ctx.fns.record)'                       # everything one module has
```

The **docstring is the comment the file opens with** — so write one, and read
one before calling.

## Making an edit take effect

The project you are working on (`WORKDIR/src`, mounted as `app`) does **not**
reload on every save: a half-written batch would drop live routes. So finish the
whole change, then remount once:

```sh
.workspace/repl 'await ctx.fns.services.restart({ name: "app" })'
```

Finer tools, when you want one file rather than the app:

```sh
.workspace/repl 'await ctx.fns.procs.dev.sync({ rel: "vitals/latest.ts" })'   # this file, whatever kind it is
.workspace/repl 'await ctx.fns.procs.repl.load({ name: "vitals" })'           # one function or a whole module
.workspace/repl 'await ctx.fns.procs.http.loadRoutes({})'                     # after adding a $route_ file
.workspace/repl 'await ctx.fns.procs.modules.reload({})'                      # after adding a whole module
```

**A restart of the process is almost never the answer** — it drops the chat, the
event stream and every tab the person has open. It is needed only for `$main.ts`,
a `$start.ts`/`$stop.ts`, or a change to the framework's own boot.

If you call something before the process has read it, the REPL says so rather
than throwing `undefined is not an object` at you: the answer carries a `next`
line naming the file on disk and the one command that makes it live. Read it
instead of guessing at the name.

Did it take? A remount that failed leaves its reason on
`ctx.state.procs.dev.errors`, and every REPL answer carries them along:

```sh
.workspace/repl 'ctx.state.procs.dev.errors'
.workspace/repl 'ctx.fns.procs.dev.lint({})'      # names, collisions, case clashes
```

## Pages, not documents

A route returns `{ title, main }` (or a string) and the framework wraps it in the
host's layout; for an htmx request it returns the fragment plus the chrome. So
never return a whole document, never navigate with a full page load, and build
markup from the kit (`procs.ui.page`, `.box`, `.row`, `.button`, `.field`,
`.form`, `.notice`) so the `data-*` markers the workspace drives by are there.
Escape through `procs.ui.escape` — never a second escaper.

## Tests live beside the thing

`src/vitals/latest.test.ts` next to the function, `src/vitals.test.ts` beside the
folder. `testCtx` gives a real registry and real routes with no server:

```ts
import { testCtx } from "procs/test";
const ctx = await testCtx({ root: MY_APP });
const res = await ctx.fns.procs.http.dispatch({ url: "/vitals/latest" });
```

Run them from the package (`cd libs/record && bun test`), never from the repo
root.
