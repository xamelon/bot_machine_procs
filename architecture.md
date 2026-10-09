# procs — architecture

The long *why*. The rules themselves are [`PROCS.md`](./PROCS.md) — one page,
and the thing to read before writing code here.

The framework lives under its own namespace (§5), so every function it ships is
`ctx.fns.procs.*`. Where a sentence below names one in passing — `dev.lint`,
`hooks.run`, `genTypes` — the real name has that prefix; anything written as a
call is spelled in full.

## 1. What it is

**A procedural framework in TypeScript.** There are three kinds of thing and no
others: **namespaces**, **types**, and **functions**. No classes, no instances,
no dependency container, no decorators, no lifecycle objects to construct. A
directory is a namespace, a file is a function, and a file whose name starts
with a capital is a type.
That is the whole vocabulary, and everything below follows from keeping it that
small.

**Nothing imports anything.** A function does not `import` its neighbour; it
calls it through `ctx.fns.<ns>.<fn>` and the name is resolved at call time. That
is the single most consequential rule in the framework, and the reason for it is
**hot reload**: an import binds a value into a closure, and once some other
module holds that value, replacing the file changes nothing — the old code is
still running behind a reference nobody can reach. Resolve by name instead and
replacing a function is one assignment into a tree; every caller picks it up on
its next call, with no graph to invalidate and no cache to reason about.

Everything else in this document — the registry, `ctx` as the only state, the
REPL, the loaders — exists to keep that property true.

Four properties, and they are not four decisions — they are one decision seen
from four sides.

### The filesystem is the wiring

The registry is not built by registration calls; it is **read off the file
names**. Drop `math/fib.ts` and there is a `ctx.fns.math.fib`; drop
`math/$route_$n_GET.ts` and there is a route; drop `$hook_notes.ready.ts` and
something answers that point; drop `notes/$migration_001_notes.ts` and it runs at
boot, once, in order.

This is the same economy as having no classes: there is no configuration of
relationships, because there is nothing to configure. Nothing imports, nothing
declares, nothing is added to a list. *"Only functions"* on its own would not
give you routes, hooks or migrations — the file-name grammar is what turns one
kind of thing into all of them.

### All state lives on `ctx`, and only on `ctx`

Nothing is captured. A function does not close over a connection, a cache, a
client or a counter — it reads them from `ctx.state` when it runs, and reaches
its neighbours through `ctx.fns` at call time rather than through an import
resolved once at load.

### `ctx` is not a bag of state — it is a **world**, and worlds are derived

This is the deeper half, and the one that is easy to miss. `ctx.fns` is a Proxy
whose getter reads **`this`**, so a context derived with `Object.create` injects
*itself* into everything called through it. One line, and four unrelated-looking
features fall out of it:

| derived ctx | what you get |
|---|---|
| a request | the session flows down the whole call chain without being passed |
| `procs.env.fork({ mode })` | a second world — its own state, its own database — beside the first, **in one process** |
| `procs.repl.eval` | code typed at the REPL behaves exactly like a handler, session and all |
| a mounted app | it calls itself `app` no matter what namespace it was mounted under |

"State lives on ctx" describes a discipline. *"A ctx is a world and can be
derived"* is where the power is: two isolated worlds in one process, and a
request that is itself a small world, cost nothing beyond that getter.

### Live reload, as a consequence rather than a feature

Because nothing is captured and every lookup happens at call time, **replacing a
function is assigning into a tree**. There is no dependency graph to invalidate,
no module cache to reason about, no question of whether some other module kept a
reference to the old version — nothing was holding it.

So the process is edited in place instead of restarted. And the rule *never
import another module, never keep a module-level variable* is not style advice:
it is the mechanism. Break it and reload stops working, quietly.

### A function carries its own metadata

Clojure's vars know their name, their file and their docstring, and that is what
makes `(doc f)` and `M-.` possible. Functions in JavaScript are objects, so the
same thing costs nothing here: the fn loader hangs `{ name, module, fn, rel, abs,
doc }` on the function it just registered, and the `ctx.fns` Proxy calls with
`this` = that function — so a non-arrow function can read `this.meta` about
itself, and `procs.dev.doc` / `procs.dev.where` can answer for any of them **out
of the running image**, without touching the disk. The docstring is the leading
`//` block, read to the first line that is not a comment — so a file that opens
with an `import` has none, and a handful in the core still do.

### A REST REPL, so development is interactive

`POST /procs/repl` evaluates TypeScript **inside the running process**, with that
process's `ctx` in scope and the last expression as the value. Together with the
above the loop is: write a function, load it into the live process, call it, see
the real answer — against the real database, the real services, the real state.
No restart, no rebuild, no fixture standing in for the world.

It is a REST endpoint rather than a socket or a console because everything else
already speaks HTTP: a shell script, a test, an editor and a coding agent all
reach it the same way, from anything that can make a request.

**And it is a legitimate endpoint, so it is protected like one.** Three gates,
each covering what the others cannot: a **token** — a JWT this run signs with its
own key, `kind: "repl"`, mirrored 0600 into `.runtime/repl-token`, so a client on
this machine can read it and a proxy that can forge headers still cannot sign
one (and `procs.auth.authenticate` refuses any token carrying a `kind`, so it can
never pass for a session); **loopback**, not forwarded, so nothing reaches it from
the network even with a leaked token; and **production**, where it answers 403 from
localhost too. Those three are the whole gate: a host's login middleware leaves
`/procs/repl` open, so the REPL still answers when the app is behind an
`AUTH=password`/`sso` session. The client is generated rather than shipped —
`bun script/cli.ts generate:repl` writes `script/repl.ts` into the app, because a
client runs in its own process and must not import the framework.

### Why procedural, and not merely "functional style"

Because the properties above are only free if functions are plain. An object that
owns state cannot be swapped without losing it; an instance graph cannot be
rebuilt without knowing who holds whom. A function that takes everything it needs
as arguments — `(ctx, session, opts)` — can be replaced between two calls, run in
a second world beside the first, or moved into another process later, and nothing
else has to know.

### Where this comes from: Java's packages, Clojure's namespaces

The naming half is borrowed openly. From **Java**: a package is a directory path,
a type is a capitalised noun in a file of its own, and the jar that delivered the
code is not part of any name. From **Clojure**: a namespace is a file path, the
process is edited live at a REPL rather than restarted, and code is data-first
with no classes and no ceremony to register anything.

Where we differ from Clojure, and it is worth being clear about it:

| | Clojure | procs |
|---|---|---|
| a file is | a namespace with many functions | **one** function; the directory is the namespace |
| wiring | `require` — a real dependency graph, loaded transitively | nothing imports; names resolve at call time through `ctx.fns` |
| live redefinition | var indirection | assignment into the registry on `ctx` |
| the implicit context | dynamic vars (`binding`) | `ctx`, passed explicitly as the first argument |
| data | immutable structures, atoms/refs | one mutable `ctx.state`, and derived worlds (`env.fork`) |
| extension | macros, multimethods, data readers | the file-name grammar, hooks, `$loaders` |

So: Clojure's model of names and its way of working, without its model of data —
and no macros, which is why a file *name* carries what a macro would.

## 2. The PATH — where code comes from

A process is not one directory. It is **a search path of directories**, each
contributing namespaces to one registry — the same idea as a shell's `$PATH`, a
JVM's classpath or `PYTHONPATH`, and used for the same reason: what a program
*is* stops being decided by what sits next to its entry point.

The path is **data in the app's own `package.json`**, because the composition of
a process is not a line in its entry point:

```jsonc
{ "procs": { "path": ["../libs", "./modules"] } }
```

`PROCS_PATH` (colon-separated) replaces it for a run. `./…` and `../…` resolve
against the host's own repo, a bare relative path against the project it
supervises. A declared `path` gets the five skill directories appended to it
(`.claude/skills`, `.agents/skills`, `~/.claude/skills`, `~/.agent/skills`,
`~/.codex/skills`), so a module and an agent skill are the same folder read twice.

Each entry is a directory whose subdirectories are **containers**: a folder that
declares itself in the `procs` block of its own `package.json`
(`atomic-workspace.json` is read as a synonym).

```jsonc
{ "procs": { "src": "src",              // where its files are, relative here
             "label": "HS UI" } }       // how it shows itself — never a name
```

It says nothing about names, because a name is a path (§5): `hs-ui/src/hs/ui/
button.ts` is `ctx.fns.hs.ui.button` wherever it came from. Everything discovered
this way goes through **exactly the same** scan, classify and registration as the
app's own `src/` — one uniform list of entries, no second code path.

### Order is precedence, and precedence is declared

The scan order is: the framework's own `src`, then the app's `src`, then the
packages and folders it mounts. The app comes **right after core, so it wins over
the framework's defaults** — its `src/$route__GET.ts` beats the registry page
`procs` ships. Everything after that is named by its own path (§5), so there is
nothing left to overwrite: a module's `hs/ui/button.ts` is `hs.ui.button` no
matter when it was scanned.

Each mounted directory carries a `source`, and the source decides whether it is
mounted without being asked:

| source | what it is | on by default |
|---|---|---|
| `core` | a directory the host itself named on its `procs.path` | yes |
| `project` | the supervised project's skill dirs, under `WORKDIR` | yes |
| `platform` | the machine's global skill dirs | no — a catalogue, named to be used |
| `external` | an npm package, a git repo or a folder named in `modules` | no — declared |

A host takes its whole library at once with `"modules": { "*": {} }`; the
wildcard covers its own and the project's, never the `platform` catalogue,
because a machine has dozens of skills and a project wants three.

### Portability: absolute names, and one prefix

A module needs no portability trick: its name is its path, so `ctx.fns.hs.ui.*`
and `/hs/ui/…` mean the same thing in every host, and there is nothing to
re-resolve. Collisions are avoided the way they are in Java or Clojure — by
putting your code under your own segment.

The one exception is a host that mounts **somebody else's project** under a name
of its own (the workspace calls the project it is editing `app`, the EHR mounts
the same checkout as `ehr`). Only there does a prefix exist, and only there does
`ctx.fns.app` mean "myself": the framework hands such a tree's functions a ctx
where `app` resolves to wherever it landed, and its urls follow the same prefix.

The same care applies to files: a `$<kind>_<name>` is collected with both names —
the dotted `module` it landed under, prefix and all (`demo.patients`), and
`projectRel`, the path **the project itself wrote** (`patients/$qr_phq9.json`).
A function inside a mounted tree runs on a ctx carrying that prefix, so a module
asked for `patients/$qr_phq9.json` answers from memory with the copy whose
`module` starts with it, rather than resolving the path against the host and
finding nothing.

### What the PATH makes possible

A host is then defined by its PATH rather than by its contents — the three in
this repo, verbatim from their `package.json`:

```
workspace   "path": ["../libs", "./modules"]   + the skill dirs; WORKDIR/src is
                                               mounted as `app` when it runs in-process
EHR         "path": ["../libs", "./apps/*"]    "demo": { "prefix": "demo" } — each
                                               installed app under its own prefix
manager     "path": ["../libs"]
```

Three programs, one framework, one mechanism — and adding an app to a clinic is
a checkout plus a line, not a build.

### Where the analogy ends

A shell `$PATH` resolves a collision silently: first match wins, and you find out
by running the wrong thing. Here a collision is a **name**, not a lookup: two
files claiming one dotted name overwrite each other in the registry, and the last
one scanned is the one that runs. `dev.lint` does not catch that one — it catches
the collisions that are *within* a tree (a fn beside a namespace of the same
name, two names differing only in case, a `$hook_` answering a point nobody
declares). Prefixing your own segment is what keeps a cross-tree clash from
happening at all, which is why it is the rule rather than a convention.

## 3. Naming convention and `$loaders`

Two things wearing one name, and it is worth separating them:

- the **convention** says what a file *is* — read off its name, by one parser
  (`procs/project/classify.ts`), which produces a structured entry;
- a **loader** turns that entry into something *live* — a function in the
  registry, a route in the table, a schema in `ctx.state`, a migration in the
  list.

Not Java's classloader, which answers "where does the code come from" — that is
the PATH (§2). A loader here answers "what do I do with this file now that I have
it".

### The convention

A plain `module/name.ts` is a function. Everything else starts with `$`, where
the part after it is the kind and the parts after that are its arguments.

| file | kind | the loader does | what you get |
|---|---|---|---|
| `math/fib.ts` | fn | import, put in the registry tree | `ctx.fns.math.fib` |
| `notes/Note.ts` | type | nothing at runtime — feeds `genTypes` | `types.notes.Note` |
| `notes/$route_$id_edit_GET.ts` | route | import, put in the route table | `GET /notes/:id/edit` |
| `notes/$middleware_$id.ts` | middleware | import, register under a prefix | runs before `/notes/:id/*` |
| `notes/State.ts` | type | nothing at runtime — types `ctx.state.notes` | the module's slot |
| `greet/Session.ts` | type | nothing at runtime — merged into `Session` | fields on every session |
| `notes/$start.ts` · `$stop.ts` | lifecycle | run at boot / shutdown, in `procs.prod` order | `ctx.state.notes` |
| `notes/$config.ts` | config | collect the schema | `procs.config.resolve({ module: "notes" })` |
| `procs/ui/$point_chrome.ts` | point | record that `procs.ui.chrome` exists | a declared extension point |
| `$hook_procs.ui.chrome.ts` | hook | add to the map under `procs.ui.chrome` | answers `procs.hooks.run` / `.first` |
| `notes/$migration_001_notes.ts` | migration | collect, apply in id order, record | a table that exists |
| `$cli_hello.ts` | cli | collect as a command | `bun script/cli.ts hello` |
| `procs/ui/$script_htmx.js` | script | bundle on request (browser target) | `GET /procs/ui/htmx.js` |
| `procs/styles/$style_app.css` | style | compile with Tailwind, cache, serve | `GET /procs/styles/app.css` |
| `greeter/$phrase_polite.json` | **whatever `greeter` called it** | its loader parses and keeps it | `ctx.state.greeter.phrases["greeter:polite"]` |

Almost every row has a working example on disk — the framework's own under
`procs/src/procs/`, the app-side ones under [`test-proc/`](./test-proc), the
small app the framework's tests boot.

Skipped on purpose: `$main.ts` and `$test.ts` (reserved — the entry and the
harness), `*.test.ts`, `*.d.ts`, `*.entry.ts`, and the directories `node_modules`,
`_runtime`, `_test_*`, `_tmp_*`, `tmp_*`.

There is no nameless space at the root: a plain function file directly in `src/`
is refused with a line in the log, because a function's name is its path and a
path needs a module to start from.

### From a name to a path, and to a namespace

Two small grammars, applied to the same string:

```
notes/$route_$id_edit_GET.ts
  │      │     │   │    └── method
  │      │     │   └────── path part            _  →  /
  │      │     └────────── path param           $x →  :x
  │      └──────────────── kind
  └─────────────────────── module dir → path prefix and namespace
```

Directories nest to any depth: `billing/invoices/create.ts` →
`ctx.fns.billing.invoices.create`. And when the file came from the PATH, the
name is simply the path inside the src root, which is the one line
that makes mounting uniform — a module's route is `/greeter/…` and its function
is `ctx.fns.greeter.…` without a single branch anywhere downstream.

### `$loaders` — one table, and a file that adds to it

There is no privileged set. The framework keeps **a table of loaders keyed by
kind**, and it arrives with nine of its own already in it, in this order: `fn`,
`config`, `hook`, `migration`, `cli`, `route`, `middleware`, `script`, `style`.
That list is the precedence rule, written down (§4, phase B). `point` is not on
it: the framework ships `procs/hooks/$loader_point.ts` and it is discovered like
anybody else's. `type`, `state` and `lifecycle` have no loader at all — see the
end of §4. Anyone can add to the same table, and they add to it the way
everything else here is declared: **with a file**.

A loader is an ordinary function with the ordinary signature, handed all the
files of its kind at once:

```ts
// greeter/$loader_phrase.ts — "I own the kind `phrase` — $phrase_<name>.json"
export default async function (ctx: Context, _session: Session | null, opts: { entries: any[] }) {
    for (const entry of opts.entries) {
        const resource = await Bun.file(entry.abs).json();
        if (typeof resource?.text !== "string") throw new Error(`${entry.projectRel}: a phrase needs a "text"`);
        const phrases = ((ctx.state as any).greeter ??= {}).phrases ??= {};
        phrases[`${entry.module}:${entry.name}`] = {
            name: entry.name, module: entry.module,
            rel: entry.projectRel, abs: entry.abs, resource,
        };
    }
}
```

A loader is code, not a line of JSON, and that is the point: it can validate,
normalise, refuse a broken file with a sentence a human can act on, and register
whatever it likes — a bucket in `ctx.state`, a route per record, an index. And
because it is an ordinary file, it **hot-reloads like everything else**: edit the
loader, `procs.dev.sync` it, and the next scan uses the new rules.

### Types are marked by case, not by a `$`

`$` in this grammar means *a loader parses this file*. A type is the one thing
that is never loaded — only `genTypes` reads it — so it is marked differently:
**a file whose name starts with a capital is a type.** `notes/Note.ts` is
`types.notes.Note`; at the src root it is a global.

This works because of the other half of the convention: **a function is a verb
in lower case, a type is a noun with a capital.** `readPatient.ts` and
`Patient.ts` sit side by side; `select.ts` and `Query.ts` do too. A noun-named
function is what breaks it — and it is not a theoretical break: macOS is
case-insensitive by default, so `db/query.ts` and `db/Query.ts` are **the same
file**, and naming the type silently destroyed the function (it did, here, once).

One namespace is deliberately nouns, and it is the framework's own: a UI kit
reads as the things it renders, so `procs/ui/` is `button.ts`, `card.ts`,
`table.ts` — a whole namespace named after its output. That is safe because
nothing in there is a type. The rule that actually has to hold is not "verbs
only" but **no two names differing only in case**, which is what `dev.lint`
checks; a noun-named function is a warning that its type is now unnameable, not
an error.

Hence three things: the core's own noun-named function was renamed
(`procs.db.query` → `procs.db.select`), `dev.lint` refuses two names that differ
only in case, and `$type_Name.ts` stays legal as the escape hatch —
`bun script/cli.ts migrate:types` renames the rest and leaves those alone.

### State and session are types too, and they say where things live

Two capitalised names mean more than themselves:

- **`<module>/State.ts` types `ctx.state.<module>`.** A module's state lives under
  the module's own name, so where to look is never a question and no module can
  claim a key belonging to another. A module is **either a slot or the parent of
  slots, never both** — the same rule that already governs functions ("a name is
  either a function or a namespace"), which keeps the generated type a plain
  nested object with nothing to clobber. A module that wants state next to
  children puts it in a child of its own.
- **`<module>/Session.ts` adds fields to the session.** `genTypes` assembles one
  interface — the framework's base (`req`, `params`, `trace`, `kind`) plus every
  contribution — so a module declares the field it attaches (`greet/Session.ts`
  adds `greeted`) and nobody overrides the type. The base also carries an index
  signature, so a field nobody typed — `session.user`, set by a host's
  middleware — still passes. Before this, extending the session meant *replacing*
  the framework's file, which also produced a duplicate global the moment two
  trees did it.

So the generator owns the two composite types: `CtxState` and `Session` are
assembled from the modules present into `src/ctx_ns.d.ts`, and `src/Context.ts`
stays a thin alias that glues them to the generated `FnsRegistry`.

### One scan, and the phase a file is loaded in

A loader has to exist before the files it owns are loaded — but *not* before they
are classified. `classify` reads a name and returns the prefix as the kind; it
never asks who owns it. So `$phrase_polite.json` is a `phrase` from the moment it
is seen, whether or not anything will ever load it, and the scan happens **once**.

"Nobody owns `phrase`" is then a question answered at load time, with the file
named in the log — which is what a typo in a prefix should look like, instead of
a file that quietly means nothing.

What remains is an ordering of *loading*, not of *reading*, and it is the three
phases in §4. The one real rule survives unchanged: **a loader cannot be produced
by a loader.** `$loader_*.ts` is loaded by the bootstrap itself, never by the
table it fills, so there is no recursion to bound.

(This replaces an earlier sketch where a module declared its kind in the manifest
as data. Data was chosen to dodge the ordering problem; phases solve the same
problem without giving up validation, hot reload, or the rule that everything in
this framework is a file.)

### What a data loader produces

```ts
// EHR mounts that checkout as "demo": { "prefix": "demo" }
ctx.state.questionnaire.items["demo.patients:phq9"] = {
    name: "phq9", module: "demo.patients",   // the dotted name it landed under, prefix and all
    rel: "patients/$qr_phq9.json",          // entry.projectRel — the path the project itself wrote
    abs: "/…/EHR/apps/demo/src/patients/$qr_phq9.json",
    resource: { resourceType: "Questionnaire", … },
}
```

Two properties are the whole point. The key carries the **module**, so two apps
shipping `$seed_patients.json` both survive rather than one silently replacing
the other. And the record carries **provenance** — `abs`, plus the `projectRel`
the project itself wrote — so the owning module can answer a caller that names a
path from memory, instead of resolving that path against the *host* and finding
nothing.

*Which* copy it answers with is `ctx.namespace`: a function inside a mounted tree
runs on a ctx carrying the prefix it landed under, and the reader keeps the entry
whose `module` is that prefix or starts with it (`"demo"` matches `demo.patients`),
falling back to the first candidate when the host itself asks. The trap is to
strip a namespace off `rel` instead — `rel` is slashed and `module` is dotted, so
the strip never fires and every lookup silently returns whatever was scanned
first. `projectRel` already is the project's own path; take it.

### An extension point has an owner and a path for a name

A hook name used to be a bare string — `chrome`, `ready` — a global vocabulary
with nobody responsible for it, where a typo read as silence: the handler simply
never ran. Now a point is **declared by a file, and named by its module**:
`procs/ui/$point_chrome.ts` declares `procs.ui.chrome`, and a host answers it by
shipping `$hook_procs.ui.chrome.ts`. The declaring file's export documents the
point (what it is called with, what an answer means); the framework records only
that it exists.

That one change buys three things: `hooks.list` shows every point with who
declared it and who answers, `hooks.run` warns once when asked for a point nobody
declares, and `dev.lint` refuses a `$hook_` whose point does not exist — a typo
now has a message with a file name in it.

A point whose export says `{ family: true }` declares a whole prefix instead of
one name: `services/$point_service.ts` covers `services.service.aidbox` and
anything else a provider names itself, which is the open-ended case — the point
is a protocol and the suffix is who answers.

### Owning a loader, and reading what it collected

A kind has one **owner** — the `$loader_` that declared it and decides how a file
of that kind is collected. Everybody else reads the bucket. What a loader
collected lives in its own module's state (`ctx.state.questionnaire.items`), and
it is not private: a file manager that renders a preview for `$qr_*.json` does
not own the kind; it reads what the questionnaire module's loader collected,
together with the provenance that says which app each entry came from.

There is no second mechanism for "tell me when a file of somebody else's kind
arrives" — a module that needs to *act* on the arrival ships a `$start` that
reads the bucket once, or asks an extension point. This is the same shape as the
rest of the framework — hooks, `services.service.<name>`, the `chrome` seam:
**the host asks, the strangers answer**, and nobody imports anybody.

### The conventions, in one place

Names first — the part borrowed from Java and Clojure, where a name **is** a path
and nothing declares it:

| | convention | example |
|---|---|---|
| namespace | the directory path inside a `src` root | `hs/ui/` → `hs.ui` |
| function | **a verb**, lower case, one per file | `notes/add.ts` → `ctx.fns.notes.add` |
| type | **a noun**, capitalised, one per file | `notes/Note.ts` → `types.notes.Note` |
| module state | `State.ts` in the module | `ctx.state.hs.ui` |
| session fields | `Session.ts` in the module | merged into `Session` |
| everything the loader parses | `$<kind>[_<name>]` | `$route__GET.ts`, `$loader_qr.ts` |

`$` therefore means exactly one thing: **a loader does something with this file
at load time**. A type is never loaded, so it carries no `$`; case is enough to
tell it from a function, as long as no module names both the same word — which is
rule 3 below, and why the noun-named `procs.ui.*` kit ships no types.

Four rules keep all of that honest, checked at boot by `dev.lint` before anything
is written or built:

1. **Every segment, function name and type name is a valid JS identifier.** A
   dash or a dot would emit unquoted into the generated types and corrupt the
   whole file, and dots would corrupt the build manifest's dotted keys.
2. **A name is either a function or a namespace, never both.** `x.ts` beside
   `x/` is refused: the injecting Proxy would wrap the function and drop
   everything nested under it, and the loss would be silent.
3. **No two names differ only in case.** macOS is case-insensitive by default, so
   `query.ts` and `Query.ts` are one file — and naming a type onto a function
   destroys it silently (it did, once, here).
4. **A module is either a state slot or the parent of slots.** `hs/State.ts` next
   to `hs/ui/State.ts` is refused; rule 2 for `ctx.state`.

Two spellings are deprecated and still load, so a checkout can move over at its
own pace: `$type_Name.ts` (now `Name.ts` — except where the plain name is taken
by a function) and `$state_<key>.ts` (now the module's `State.ts`).
`bun script/cli.ts migrate:types` does the renaming.

## 4. Bootstrap and the three lifecycles

Three loops, and it is worth keeping them apart: how a process comes up, what
happens to a request, and what happens when code changes. Only the first is
"startup"; the other two run forever.

### Boot

```
boot({ root })
 │
 ├─ makeCtx()                 an empty registry and the injecting `fns` getter
 ├─ ctx.state.root = root     which project this process is
 │
 ├─ procs.boot.load           ONE scan of the PATH, then boot.apply's three phases
 │   ├─ A · every function    import every .ts file; plain names → ctx.fns
 │   ├─ B · every loader      the nine core kinds by name, in a written order,
 │   │                        then every $loader_*.ts the scan found
 │   └─ C · everything else   each kind handed to its owner, in loader order
 │
 ├─ procs.modules.fetch       clone anything declared but absent; re-run load if it arrived
 ├─ procs.dev.lint            names and collisions — logs, never stops the boot
 ├─ procs.dev.genTypes        write src/ctx_ns.d.ts
 ├─ procs.http.loadRoutes     routes · middleware · scripts · styles
 │                            → ctx.state.procs.http.routes
 ├─ procs.lifecycle.start     each module's $start in procs.prod order, http last
 └─ procs.dev.watch           in dev, unless WATCH=0
```

The three phases are not stages of a pipeline; each one exists because the next
would otherwise run in a half-built world.

**0 — the core's loaders**, imported by name before any file is loaded. That is
bootstrap, not loading: it is what lets phase A hand functions to `loaders.fn`
rather than registering them a second way.

**A — every function first.** Every `.ts` file in this framework is a function:
`export default function (ctx, session, opts)`. A route handler is one, a hook is
one, a `$start` is one, and a loader is one. So phase A imports every `.ts` file
except the ones with nothing to run: a capitalised name, which is a type, and a
skipped one (`$main.ts`, `$test.ts`, `*.test.ts`, `*.d.ts`, `*.entry.ts`). A data
file — `$phrase_polite.json`, `$style_app.css` — is not imported at all; it
reaches its loader unopened. What came back is kept on the entry, and plain names
go into the registry immediately.

Two things fall out. The registry is **complete** before any loader runs, so a
loader may use `ctx.fns.procs.log`, `ctx.fns.procs.config`, a validator from
another module — anything — instead of hand-rolling what it needs because the
world is not up yet.
And every file is imported **exactly once**: a loader takes `entry.fn` when the
bootstrap already has it, and imports the path only when there is none — which is
the hot-reload case.

**B — then the loaders.** The framework's nine are registered by name, in the
order listed in §3; the discovered `$loader_*.ts` follow, and one that claims a
reserved kind (`route`, `hook`, `config`, …) is refused by name. Discovering the core's
alongside everyone else's would make the framework's behaviour depend on the
order a directory happened to be walked in, and would let a module that sorted
earlier answer for `route`. The list *is* the precedence rule, written down where
it can be read.

**C — then everything else, by its owner.** Files are grouped by kind and the
kinds are processed **in the order their loaders were registered** — so the
sequence is that written list, not the order a glob returned files in. A loader is a
function like everything else here — `(ctx, session, { entries })` — and it is
handed **all** the files of its kind at once, so a kind whose table is rebuilt
atomically can do that and a kind that does not care just loops. A kind with
files and no owner is reported, not ignored.

**`$start` order is the app's `procs.prod`, and `http` is forced last** — the port
opens only after everything it will serve is up. A `$start` that throws rolls
back the ones that already ran, so a half-started process never accepts traffic.

### A request

```
Bun.serve → match → makeRequestCtx(session) → middleware* → handler → toResponse
```

The request ctx is a derived world: everything the handler calls through
`ctx.fns.*` sees this session without anyone passing it. Middleware may extend
that session or return a `Response` and stop. `toResponse` decides between a
document and a fragment, and appends the host's `chrome` for a fragment.

`procs.http.dispatch` is the same line minus the socket — which is what makes
routes testable without a port, and internal sub-requests possible.

### A change

```
write a file → procs.dev.def / procs.dev.sync → procs.repl.load (re-import,
             → assign into ctx.state.registry            cache-busted)
             → procs.dev.genTypes  (+ procs.http.loadRoutes if it was a route)
             → procs.events tells the open tab over SSE
```

Nothing restarts. The old function was held by nobody, so replacing it is an
assignment; the process keeps its connections, its caches and its sessions.

What does need a restart, and why: `src/$main.ts`, `procs/http/$start.ts` and
`procs/dev/watch.ts` live as running closures, and a browser asset inlined by a
text import is baked into its route at first import.

### One table, three entrances

A file changed on disk, a file found at boot, and a file baked into a production
bundle all arrive at the same place. `boot.apply(ctx, entries, modules)` is the
whole of "turn a list of files into a running process"; what differs is only how
the list was obtained — the dev boot scans, `dev.manifest` freezes the scan into
static imports (each entry keeping its fields, plus `fn`, the module already
imported), and the prod entry hands that frozen list to the same `apply`. The
build used to be a second implementation of every kind; now it has no opinion
about what a `$route_` means at all.

### One table, two entrances

A file changed on disk goes through **the same table** as it did at boot:
`collectStateFile` looks up `ctx.state.procs.boot.loaders[kind]` and hands the
file over, exactly as phase C does. There is no second list of kinds that reload — a kind a
module added reloads like one the framework ships, or the two paths would drift
and the drift would show up as "works after a restart".

### One table, no exceptions

Routes, middleware, scripts and styles are loaders now —
`procs/http/$loader_route.ts`, `procs/http/$loader_middleware.ts`,
`procs/http/$loader_script.ts`, `procs/styles/$loader_style.ts` — registered by
name like the rest of the core's. `procs.http.loadRoutes` kept only what a loader
cannot do: it rebuilds into a **draft ctx** with empty tables, runs the same four
loaders against it, and swaps the result in, so a deleted file leaves no handler
behind and a request mid-rebuild never sees a half-built table.

What is left outside the table is only what is not loaded at all: a type
(`Note.ts`, `State.ts`, `Session.ts`, and the deprecated `$state_<key>.ts`) and
`$start`/`$stop`, which `procs.lifecycle.start` runs when its turn comes.

## 5. Modules — a name is a path

### The framework is a module tree like any other

`procs` ships its modules under `src/procs/`, so they are named the way every
module is: `ctx.fns.procs.http.dispatch`, `types.procs.db.Query`,
`ctx.state.procs.http.routes`, `GET /procs/modules`. Two things follow, and both
were the point:

- **The good names stay free.** `log`, `http`, `ui`, `db`, `config` are what an
  app wants to call its own modules, and the framework no longer squats on them.
- **Nothing is overridden by accident.** An app used to replace a framework file
  by shipping one with the same name — quiet, and dependent on scan order. Now
  the two live under different names, so a replacement has to be an explicit
  seam: `toResponse` prefers an app's `ui.layout` and falls back to
  `procs.ui.layout`; a host's `GET /` simply wins on the route table, which is an
  address, not a name.

A name in this framework is **the path of the file inside a `src` root**, the way
a package is a directory in Java and a namespace is a file path in Clojure.
`src/hs/ui/button.ts` is `ctx.fns.hs.ui.button` and serves `/hs/ui`, whether that
`src` arrived as a folder on the PATH, as an installed npm package, or as the app
itself. Nothing declares a name and nothing renames one, so the name and the
place always agree — and prefixing your own segment (`hs/…`) is what keeps two
vendors from colliding.

A **module** is then simply a namespace that has module-shaped files:
`hs/ui/$config.ts` makes `hs.ui` configurable, `$start.ts` makes it startable,
`$middleware.ts` gives it a prefix. It can be at any depth; `hs` on its own is
just a segment of a name.

### Containers deliver, they do not name

A folder on the PATH and an npm package are **containers** — a jar, not a
namespace. What their name is used for is delivery and nothing else: provenance
(`from`), configuration, a catalogue entry, and the one thing that must be
decidable before any file is read — whether to mount it at all.

```
procs.modules: { "measures": { "npm": "@test/measures" }, "agent": false, "*": {} }
                  ↑ the container                          ↑ never mounted
```

```
node_modules/@test/measures/src/measures/bmi.ts   →  ctx.fns.measures.bmi
modules/hs-ui/src/hs/ui/button.ts                 →  ctx.fns.hs.ui.button
src/notes/add.ts                                  →  ctx.fns.notes.add
```

The roots are read core-first, then the app's own `src`, then the packages,
folders and externals it mounts. Only the first two can collide — everything a
container ships is named by its own path — and the app is second, so its
`src/$route__GET.ts` wins over the framework's.

A container declares itself in the `procs` block of its own `package.json`
(`atomic-workspace.json` is still read as a synonym). The block says where its
`src` is and how it presents itself — `label`, `icon`, `optional`, `preview` — and
nothing about names.

### One exception: a tree mounted under a prefix

A host that supervises somebody else's project mounts it under a name of its own
(the workspace calls the project it is editing `app`). That is the only place a
prefix exists, and the only place `ctx.fns.app` means anything: a file inside
such a tree calls itself `app` and resolves to wherever it was mounted. Modules
named by their own paths do not need it — they call themselves by their name,
which is the same everywhere.

### What a module is at runtime

One record in `ctx.state.procs.modules` per mounted container, listing what it
delivered: `name`, the `namespaces` its files landed under, `source`/`from`, its
config — and its **introspection**, read off the files and never declared: `fns`,
`routes`, `hooks`, `loaders`, `provides`, `tab`, `client`, `skill`. Shipping a
file IS the declaration: `provides` is the suffix of each
`$hook_services.service.<name>.ts` it ships — the family point `libs/services`
declares, so answering it *is* supplying the service. Files from every container
merge into **one** `ctx.fns`, so a `$loader_*` shipped by one owns the files of
all the others.

### Mounting is the boundary — not starting

Two lists, two jobs: what **exists** (the containers above) and what **runs**
(`procs.prod`, which names the modules that start and in what order, `http`
last).

The trap is to read the second as a boundary. It is not: loading a file executes
it, so a container that is mounted but not started has already run its top-level
code, registered its routes and subscribed to its hooks — only its `$start` was
skipped. `"agent": false` is therefore applied when the containers are picked,
before the scan: its files are never opened.

### One composition list, in `package.json`

What the process is made of is `procs.modules`: the key is the container, the
value says where it comes from and how it is configured. `procs.prod` beside it
says what starts.

```jsonc
{ "procs": {
    "path": ["../libs", "./modules"],             // where to look for containers
    "modules": {
      "billing": {},                              // a folder found on the path
      "vitals":  { "npm": "@hs/measures" },       // an installed package
      "labs":    { "path": "./tools/labs" },      // a folder the project ships
      "reports": { "git": "https://…/reports" },  // a repo, cloned by modules.fetch
      "demo":    { "prefix": "demo" },            // mounted under a name of its own
      "agent":   false,                           // excluded — never mounted
      "*":       {}                               // the whole library at once
    },
    // start order; the framework's own modules are named by their path too
    "prod": { "procs/log": {}, "procs/db": {}, "procs/http": { "port": 3000 } }
} }
```

One grammar for every source. A supervised project may add to the same list in
`WORKDIR/workspace.json` under `modules` — that is the workspace case, where a
project turns modules on for itself — and it is the same shape, merged on top.

`ctx.fns.procs.modules.*` lists, adds, fetches and removes them at runtime, and
`GET /procs/modules` is the same thing as a page.
