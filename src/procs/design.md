# procs — the extraction, and what it left

The record of pulling one framework out of the apps that had each copied it: what
was measured, what was decided, where each decision landed, and what the split
did not finish. The move is done — `workspace`, `manager` and `EHR` are all apps
on `procs`, the shared modules are `libs/*`, and the repo is one bun workspace.

**The framework's contract is [`PROCS.md`](./PROCS.md); why it is shaped that way
is [`architecture.md`](./architecture.md).** Nothing here restates them.

---

## 1. Before the split — history

Measured at the time over `*.ts`, excluding tests and the generated `ctx_ns.d.ts`:

| | files | shape |
|---|---|---|
| `workspace/src` | 299 | the framework **+** the workspace app |
| `manager/src` | 271 | a **copy** of the framework + the manager app |
| `uniskill/src` | 520 | an **older copy** + ~490 files of its own |
| `EHR/src` | 11 | the app only — it booted the runtime |

`workspace/src` against `manager/src`, by content: **143 byte-identical, 30
diverged at the same path**, 126 workspace-only, 98 manager-only. About **4,200
lines of `manager/src` were a second copy**; `ui/` alone was 913 lines, 48 of its
50 files identical. The 30 diverged files were not two designs — they were one
design where the workspace had moved and the manager had not.

Two facts decided the shape of the split:

- **The core was stable.** Three independent forks, years apart, carried the same
  modules under the same names. The line between framework and app was a real
  one, not a shape somebody imposed.
- **Nothing propagated between copies.** The loopback-and-not-proxied gate on the
  REPL route existed in both trees **in different wordings** — a security fix
  applied twice, by hand, with no mechanism to notice if it had been applied only
  once.

`uniskill` (`~/.agent/skills/uniskill`) was the earliest fork and the furthest
adrift: 5 files identical, 25 diverged, 490 its own, and none of `lifecycle`,
`migrate`, `modules`, `ui`, `env`, `cli`, `log`, `styles`, `auth`.

`EHR` was the proof it could be done at all: no copy of anything, one
`boot({ root })` over two scan roots, the app root scanned after core so its
same-named files were overrides rather than forks. Its debt was *how* it reached
the framework — `import … from "../workspace/src/$main"`, a clinical host
depending on the development environment's tree, coding agent and chat included.

---

## 2. The decisions, and where each landed

| | the decision | today |
|---|---|---|
| **D1** | an app reaches the framework as a workspace dependency, not a path | **done** — the repo is one bun workspace (`procs`, `workspace`, `libs/*`, `workspace/modules/*`, `EHR`, `manager`) and an app's `src/$main.ts` is `import { boot } from "procs"` plus `await boot({ root: resolve(import.meta.dir, "..") })` (the EHR's reads the repo's `.env` first). Two paths are left over — §4 |
| **D2** | `ui` belongs to the framework | **done, and then some** — the framework took a namespace of its own, so the kit is `procs/src/procs/ui/*` → `ctx.fns.procs.ui.*` and the short name `ui` is free for an app. What is left is a layout, and a patient band where the host draws one: `workspace/src/ui` 6 files, `EHR/src/ui` 5, `manager/src/ui` 1 — `layout.ts` |
| **D3** | `auth` splits, mechanism from policy | **done** — `procs/src/procs/auth` is `keys · sign · verify · cookie · authenticate` with its `State` and `$config`; the doors stayed with the apps (`workspace/src/auth`, `manager/src/auth` + `manager/src/sso`) |
| **D4** | the domain library is shared, not copied | **done, differently** — not a symlink into the workspace but its own packages under `libs/`: `aidbox apps chart ehr fhir portal questionnaire record seed services tasks viewdef voice`. A host mounts them by putting `../libs` on its path |
| **D5** | configuration stops being forked source | **done** — a default path is a `procs.prod` entry in the app's `package.json`, not a forked `db/url.ts` |
| **D6** | `$` is an extension point, and a loader is a file | **done, further than planned** — below |

**D6 as built.** Every kind is a loader, the framework's own included:
`procs/src/procs/boot/load.ts` registers `CORE_LOADERS` — `fn · config · hook ·
migration · cli · route · middleware · script · style` — by name, then whatever
`$loader_<kind>.ts` files the scan found; `RESERVED_KINDS` is what a module may
not claim. The design's two-pass scan became **one scan and three phases**: A
imports every `.ts` and registers the plain functions, B fills the loader table,
C hands each remaining file to whoever owns its kind — so a loader runs in a
finished world and calls `ctx.fns.*` like any other function, and an app file is
imported once: phase A hangs `entry.fn` on the entry and the loader is handed it
there. The framework's own nine core loaders are the exception — bootstrap
imports them by name *before* phase A, and phase A imports them again under a
fresh `?t=`, so a dev boot holds two instances of each. `$app_` and `$seed_` did
become somebody's:
`libs/apps/src/apps/$loader_app.ts`, `libs/seed/src/seed/$loader_seed.ts`,
`libs/questionnaire/src/questionnaire/$loader_qr.ts`,
`libs/chart/src/chart/$loader_chart.ts`.

Two things went with it that the design only implied. **plugin** left the
composition vocabulary: a module is a namespace with module-shaped files,
composition is the `procs` block of a `package.json`, and a project's list is
`workspace.json` `modules` — `plugins` and `atomic-workspace.json` are read as
older spellings and never written. The rename is not finished, though; §4 has
what is left. And `toResponse` stopped knowing about tab strips and patient
banners: it asks `procs/src/procs/ui/$point_chrome.ts`, and a host that draws
chrome answers with a `$hook_procs.ui.chrome.ts` of its own — `workspace`, `EHR`,
`test-proc`. The manager registers none and pays nothing.

---

## 3. What the repo is now

```
procs/          the framework, under its own namespace — src/procs/** → ctx.fns.procs.*
  test-proc/    the executable example; the framework's own tests boot this, not an app
libs/           the shared modules: aidbox apps chart ehr fhir voice
                portal questionnaire seed services viewdef
workspace/      src: agent · auth · chat · deploy · ui
                modules/: chats · filemanager · git · processes · tasks · ui
                (processes ships from modules/services — a folder is not a name)
manager/        src: manager · multibox · users · mail · sso · auth · ui
EHR/            src: patient · ui
                apps/: ehr · engagement — symlinks to manager/templates/,
                each mounted under its own prefix
test-workspace/ a small project to supervise by hand
```

`*.ts`, tests and `ctx_ns.d.ts` excluded: `procs/src` 208, `manager/src` 111,
`workspace/src` 92, `libs` 111, `workspace/modules` 46, `EHR/src` 14.

Composition is data in each app's `package.json` — `procs.path` says where to
look, `procs.modules` what to mount, `procs.prod` what starts (`http` forced
last):

| app | `procs.path` | `procs.modules` | what it mounts |
|---|---|---|---|
| `manager` | `../libs` | `{}` | `aidbox`, `apps`, `seed`, `services` — the shared modules that are not `optional`. It calls none of them, but mounting is not free: routes load for every mounted tree, so the manager serves `GET /aidbox`, `GET /apps`, `POST /apps/close`, `GET /apps/:name` without having written them. A supervisor was meant to mount nothing it did not write |
| `workspace` | `../libs`, `./modules` | `{}` | the same four, plus its own `chats · filemanager · git · processes · tasks · ui`. The machine's skill directories stay a catalogue until `workspace.json` names one, and the supervised project's `src` is mounted as `app` while an in-process service runs |
| `EHR` | `../libs`, `./apps/*` | `{ "*": {}, "flow": {} }` — the `/*` is what mounts each installed project under its own prefix | the whole library at once, plus each installed app under the prefix that keeps two apps shipping `patients/` apart |

---

## 4. What the split did not finish

1. **One supervisor, two callers.** Half done. The workspace's supervisor is now
   `libs/services` — `spawn · superviseExit · captureLogs · waitReady ·
   freePort · restart · stop · logs`, shared by anything that mounts `../libs`.
   The manager still carries its own copy of those names under
   `manager/src/manager/`, because what it starts is a workspace with a box
   claimed from a pool rather than a service declared in `workspace.json`. The
   same eight names, in two places.
2. **uniskill is still outside.** `~/.agent/skills/uniskill` is on none of this:
   its own old fork, its own `src/`, ~490 files of tools — which are exactly what
   a module path is for.
3. **The rename stopped at the core's edge.** `plugin` is still the parameter of
   a documented call — `screen.openTab({ plugin })`, since moved out of the core
   into `libs/screen` — and an entity
   `screen.click` takes (`entity: "plugin"`); `procs/modules/discover.ts` still
   looks for a `plugins/` directory beside `modules/`; `workspace.json`'s
   `plugins` is still read, and folded into `modules` by the next `modules.add`
   or `modules.remove`.
4. **Two paths D1 did not reach.** The EHR has no `script/` of its own, so its
   `repl` script is `bun ../workspace/script/repl.ts` — a clinical host reaching
   into the development environment again; `bun script/cli.ts generate:repl`
   would give it one. And `workspace/package.json` depends on
   `"procs": "file:../procs"` where `manager` and `EHR` say `workspace:*`.
5. **The REPL client does not start the process.** uniskill's `script/repl.ts`
   starts the server when it is not running (tmux, falling back to a detached
   spawn); the client procs generates (`bun script/cli.ts generate:repl`) reads
   `.runtime/port`, does not find one, and exits with "is the server running?".
