# procs — shared bot core

This repository supplies a shared framework and base bot admin, normally mounted as a Git submodule. Core is `src/procs/`, bootstrap is `src/$main.ts`, tests use `src/$test.ts`. A consuming app calls boot({root}) with its own root and supplies its own src modules. Read [PROCS.md](./PROCS.md) for the framework contract.

- Never import `"procs"`, `"procs/test"` or `"procs/boot"`. Bootstrap/test infrastructure uses relative imports.
- Application functions call `ctx.fns.<module>.<fn>(opts)` so hot reload can replace them. One file, one default export. State belongs on `ctx.state` under the module's name.
- Paths name functions: `src/procs/db/select.ts` is `ctx.fns.procs.db.select`; app modules live alongside `procs`.
- Compose in the root `package.json`: `procs.prod` is start order, `procs.modules` mounts optional containers from `modules/`.
- Tests sit beside their code. `testCtx()` loads the registry and routes without starting a server. Test fixtures live in `test-proc/`.
- Runtime code is editable under `src/`, including the framework. The supervisor and credentials remain outside that tree. Do not weaken supervisor auth, Origin checks, REPL isolation or file path validation.
