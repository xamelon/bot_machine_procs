// The framework, exercised through an app rather than through itself.
// `test-proc/` is a small but complete proc application — a function, a route
// with a parameter, a middleware, a config schema, a migration, a lifecycle
// pair, a CLI command, an extension point, and a module mounted from a
// directory with data files of its own. Every feature is asserted here against
// that app, which means the test doubles as the example: if you want to know
// what a `$hook_` or a `$<tag>_` file does, read the fixture and then read the
// assertion.
import { test, expect } from "bun:test";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..", "test-proc");

const { testCtx } = await import("./$test");
// The fixture's own namespaces (math, notes, greeter) are generated into
// test-proc's types, not the framework's, so reach them through a loose handle.
const ctx = await testCtx({ root: ROOT, env: { PROCS_PATH: "./modules" } });   // deterministic: only the fixture's own
const fns = ctx.fns as any;

// ─── the registry and implicit injection ──────────────────────────────────────

test("a file becomes a function, called with opts alone", () => {
    // src/math/fib.ts → fns.math.fib; ctx and session are injected.
    expect(fns.math.fib({ n: 10 })).toEqual({ n: 10, fib: 55 });
});

test("modules call each other through ctx, never by import", () => {
    // sum() calls fib() the only way there is — and that indirection is what
    // keeps hot-reload, mounting and (later) a worker boundary possible.
    expect(fns.math.sum({ upto: 5 })).toBe(1 + 1 + 2 + 3 + 5);   // fib(1..5)
});

test("a derived ctx injects itself, which is one mechanism doing four jobs", () => {
    const forked = ctx.fns.procs.env.fork({ mode: "test", env: { ...ctx.env, NOTES_LIMIT: "1" } });
    // Same registry, different world: the fork resolves the same functions but
    // reads its own env — the same trick behind request sessions and mounting.
    expect((forked.fns as any).math.fib({ n: 7 })).toEqual({ n: 7, fib: 13 });
    expect((forked.fns as any).procs.config.resolve({ module: "notes" }).limit).toBe(1);
    expect(ctx.fns.procs.config.resolve({ module: "notes" }).limit).toBe(20);
});

// ─── routing ──────────────────────────────────────────────────────────────────

test("a route is a file name: $route_$n_GET.ts → GET /math/:n", async () => {
    const res = await ctx.fns.procs.http.dispatch({ url: "/math/10" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ n: 10, fib: 55 });          // an object becomes JSON
});

test("a page comes back as a document, or as a fragment for htmx", async () => {
    const full = await (await ctx.fns.procs.http.dispatch({ url: "/math", headers: { accept: "text/html" } })).text();
    expect(full).toContain("<!doctype html>");                      // through ctx.layout
    expect(full).toContain(`data-page="math"`);

    const partial = await (await ctx.fns.procs.http.dispatch({ url: "/math", headers: { "hx-request": "true" } })).text();
    expect(partial).not.toContain("<!doctype html>");               // just the fragment
    expect(partial).toContain(`data-page="math"`);
});

test("chrome outside the swapped fragment rides along out of band", async () => {
    // src/$hook_chrome.ts is the seam: the framework appends whatever the host
    // registers, and knows nothing about what it is.
    const partial = await (await ctx.fns.procs.http.dispatch({ url: "/math", headers: { "hx-request": "true" } })).text();
    expect(partial).toContain(`id="where" hx-swap-oob="true"`);
    expect(partial).toContain("/math");

    const full = await (await ctx.fns.procs.http.dispatch({ url: "/math", headers: { accept: "text/html" } })).text();
    expect(full).not.toContain("hx-swap-oob");                      // a full page needs none
});

// ─── middleware ───────────────────────────────────────────────────────────────

test("middleware extends the session, and the handler never reads the query", async () => {
    const res = await ctx.fns.procs.http.dispatch({ url: "/greet?who=Ada" });
    expect(await res.json()).toEqual({ greeting: "hello, Ada" });   // GREETING from workspace.json
});

test("middleware can refuse, and then no handler runs", async () => {
    const res = await ctx.fns.procs.http.dispatch({ url: "/greet?who=nobody" });
    expect(res.status).toBe(403);
});

// ─── configuration ────────────────────────────────────────────────────────────

test("config layers defaults, package.json and the environment, and coerces", () => {
    const cfg = ctx.fns.procs.config.resolve({ module: "notes" });
    expect(cfg.title).toBe("Notes");                                 // schema default
    expect(cfg.limit).toBe(20);                                      // coerced to a number

    const loud = ctx.fns.procs.env.fork({ mode: "test", env: { ...ctx.env, NOTES_TITLE: "Loud", NOTES_LIMIT: "3" } });
    expect((loud.fns as any).procs.config.resolve({ module: "notes" })).toMatchObject({ title: "Loud", limit: 3 });
});

// ─── lifecycle ────────────────────────────────────────────────────────────────

test("$start runs in the declared order and its return value becomes module state", async () => {
    const app = ctx.fns.procs.env.fork({ mode: "test", env: { ...ctx.env } });
    await (app.fns as any).procs.migrate.up({});
    const { started } = await (app.fns as any).procs.lifecycle.start({});

    // package.json proc.prod is the list *and* the order; http is forced last.
    expect(started).toContain("notes");
    expect(started.indexOf("procs/db")).toBeLessThan(started.indexOf("notes"));
    expect(app.state.notes.title).toBe("Notes");                     // what $start returned

    await (app.fns as any).procs.lifecycle.stop({});
    expect(app.state.notes.stopped).toBe(true);                      // $stop got that state back
});

// ─── persistence ──────────────────────────────────────────────────────────────

test("a migration file is applied once, and the db lives on the ctx", async () => {
    const world = ctx.fns.procs.env.fork({ mode: "test", env: { ...ctx.env } });
    expect((await (world.fns as any).procs.migrate.up({})).applied).toContain("001_notes");
    expect((await (world.fns as any).procs.migrate.up({})).applied).toEqual([]);     // idempotent

    (world.fns as any).notes.add({ text: "first" });
    (world.fns as any).notes.add({ text: "second" });
    expect((world.fns as any).notes.list({}).map((n: any) => n.text)).toEqual(["second", "first"]);

    // Another world, another database — same code, no leakage.
    const other = ctx.fns.procs.env.fork({ mode: "test", env: { ...ctx.env } });
    await (other.fns as any).procs.migrate.up({});
    expect((other.fns as any).notes.list({})).toEqual([]);
});

// ─── extension points ─────────────────────────────────────────────────────────

test("a hook is answered by everyone who registered, host and module alike", async () => {
    const answers = await ctx.fns.procs.hooks.run({ name: "notes.ready" });
    // The app registered one; the mounted module registered another, and the app
    // never named the module.
    expect(answers.sort()).toEqual(["app", "greeter"]);
});

// ─── mounting ─────────────────────────────────────────────────────────────────

test("a name is a path inside src — the folder that delivered it is not part of it", () => {
    // test-proc/modules/greeter/src/greeter/say.ts → ctx.fns.greeter.say, and
    // test-proc/modules/hs-ui/src/hs/ui/button.ts → ctx.fns.hs.ui.button. The
    // container ("greeter", "hs-ui") names nothing: like a jar holding
    // com/foo/Bar.class, it only delivers.
    expect(typeof fns.greeter.say).toBe("function");
    expect(fns.hs.ui.button({ label: "ok" })).toBe("<button>ok</button>");
    expect(ctx.state.procs?.http.routes["/greeter"]?.GET).toBeDefined();
    expect(ctx.state.procs?.http.routes["/hs/ui"]?.GET).toBeDefined();                  // the url is the same path
});

test("a module is a namespace that has module-shaped files, at any depth", () => {
    // `hs/ui/$config.ts` makes `hs.ui` a module — configurable, startable,
    // nameable in procs.prod — while `hs` is only a segment of the name.
    expect(ctx.fns.procs.config.resolve({ module: "hs/ui" }).theme).toBe("light");
    const container = (ctx.state.procs?.modules ?? []).find((m: any) => m.name === "hs-ui")!;
    expect(container.namespaces).toEqual(["hs.ui"]);
});

test("a module's data files are read by the scan, keyed by module, with provenance", () => {
    // `$phrase_polite.json` — a `$<tag>_<name>.json` the module owns. The key
    // carries the namespace, so two modules may ship the same file name; the
    // record carries where it came from, so nothing builds a filesystem path.
    const bucket = (ctx.state as any).greeter.phrases;
    expect(Object.keys(bucket)).toContain("greeter:polite");
    expect(bucket["greeter:polite"].resource).toEqual({ text: "good day" });
    expect(bucket["greeter:polite"].rel).toBe("greeter/$phrase_polite.json");   // the path inside the src that shipped it
    expect(bucket["greeter:polite"].abs).toContain("/test-proc/modules/greeter/src/greeter/");
});

test("a module carries its meta, and what it IS comes from introspection", () => {
    // Declared: a name and a face, and nothing about behaviour.
    const greeter = (ctx.state.procs?.modules ?? []).find((m: any) => m.name === "greeter")!;
    expect(greeter).toMatchObject({ label: "Greeter", source: "core", namespaces: ["greeter"] });

    // Read off its files: it ships fns, answers GET /greeter, answers the
    // `ready` hook and owns the kind `phrase`. None of that is declared
    // anywhere — shipping the file IS the declaration.
    expect(greeter.fns).toContain("greeter.say");
    expect(greeter.routes).toContain("GET /greeter");
    expect(greeter.hooks).toContain("notes.ready");
    expect(greeter.loaders).toContain("phrase");
    expect(greeter.tab).toBe(true);

    // `provides` is read off the SAME files: a `$hook_services.service.<name>.ts`
    // answers the family point libs/services declares, so the suffix is the
    // service. (Regression: this used to look for a `service.` prefix, which no
    // hook is ever called, so every module in every host provided nothing.)
    expect(greeter.provides).toEqual(["greeter"]);

    // The browser half is read off the files too. A module ships
    // `$script_client.js` and the layout links it — no host names it, and that
    // is the only way a module can put code in the page. (Regression: `clients`
    // was read off ROUTES alone, so a module that shipped the file had it served
    // at `/notes/client.js` and linked by nobody; the feature it carried — Enter
    // sending a message — simply did nothing wherever the layout had not been
    // edited by hand.)
    const ships = (ctx.state.procs?.modules ?? []).find((m: any) => (m.namespaces ?? []).includes("notes"))!;
    expect(ships.clients).toContain("/notes/client.js");
    // …stamped with the run that serves it (`procs.ui.asset`), so a browser
    // cannot answer this page from an older run's cache.
    expect(ctx.fns.procs.ui.layout({ main: "" })).toMatch(/<script src="\/notes\/client\.js\?v=\d+" defer><\/script>/);
});

test("what the process is made of is one list, in package.json", async () => {
    // `procs.modules` names every module and where it comes from: a folder found
    // on PROCS_PATH, an installed package (`npm`), a path, a repo — or `false`.
    // A supervised project may add to the same list in workspace.json; nothing
    // else composes a process.
    const pkg = await Bun.file(ROOT + "/package.json").json();
    expect(pkg.procs.modules).toMatchObject({ measures: { npm: "@test/measures" }, agent: false });
    // The key names the CONTAINER — what to mount and what to exclude. What it
    // is called inside the registry is a different question, answered by paths.
    for (const name of ["measures", "units", "greeter", "hs-ui"]) expect((ctx.state.procs?.modules ?? []).some((m: any) => m.name === name)).toBe(true);
});

test("a module declares itself in its own package.json", () => {
    // One manifest: the `procs` block of the module's package.json says its
    // namespace, where its code is and how it presents itself. (The older
    // atomic-workspace.json — what greeter still uses — is read as a synonym.)
    expect(fns.units.cm({ inch: 10 })).toBe(25.4);
    expect((ctx.state.procs?.modules ?? []).find((m: any) => m.name === "units")).toMatchObject({ label: "Units" });
});

test("a module excluded in the composition list is never mounted — not merely not started", async () => {
    // `"agent": false` in package.json `procs.modules` is applied when the
    // folders are picked, BEFORE the scan.
    // So its files are never opened, its top-level code never runs, and the
    // route it ships does not exist. That is the boundary; proc.prod is not one.
    expect(fns.agent).toBeUndefined();
    expect((ctx.state.procs?.modules ?? []).some((m: any) => m.name === "agent")).toBe(false);
    expect((await ctx.fns.procs.http.dispatch({ url: "/agent" })).status).toBe(404);
});

test("a module can arrive from npm — the marker is a `procs` block", async () => {
    // test-proc's composition names @test/measures, a package whose package.json
    // carries a `procs` block. That block IS the marker: a package without one
    // is an ordinary library nobody mounts.
    expect(fns.measures.bmi({ kg: 80, m: 2 })).toBe(20);

    // Its name comes from the path inside its src (`src/measures/bmi.ts`), not
    // from the package name — an npm package is a jar, not a namespace.
    expect((await ctx.fns.procs.http.dispatch({ url: "/measures" })).status).toBe(200);

    const container = (ctx.state.procs?.modules ?? []).find((m: any) => m.name === "measures")!;
    expect(container).toMatchObject({ source: "external", from: "@test/measures", label: "Measures", namespaces: ["measures"] });
});

test("a file reloads through the same table it booted through", async () => {
    // Boot and hot reload are one path. The kind `phrase` was added by a module,
    // not by the framework, and it reloads exactly like `$config.ts` does —
    // because both are answered by whoever owns the kind, out of one table.
    const { collectStateFile, isLoaded } = await import("./procs/boot/load");
    expect(isLoaded(ctx, "phrase")).toBe(true);

    const bucket = (ctx.state as any).greeter.phrases;
    delete bucket["greeter:polite"];
    // What the scan would have handed it: the path inside the module that ships it.
    const entry = { ...ctx.fns.procs.project.classify({ rel: "greeter/$phrase_polite.json" }), module: "greeter", projectRel: "greeter/$phrase_polite.json" };
    await collectStateFile(ctx, entry, ROOT + "/modules/greeter/src/greeter/$phrase_polite.json");
    expect(bucket["greeter:polite"].resource.text).toBe("good day");
});

test("a loader runs in a finished world — every function exists before any loader does", () => {
    // Phase A imports every function, phase B the loaders, phase C hands each
    // file to its owner. So `$loader_phrase.ts` can call ctx.fns.procs.log.debug while
    // loading, and this data only exists because that call did not throw.
    expect(Object.keys((ctx.state as any).greeter.phrases)).toContain("greeter:polite");
    // And a `$`-file is a function too: it was imported once, by phase A.
    expect(typeof fns.greeter.say).toBe("function");
});

test("a module reads its own data by its own name", () => {
    expect(fns.greeter.say({ to: "world" })).toBe("good day, world");
});

// ─── the CLI ──────────────────────────────────────────────────────────────────

test("a $cli_ file is a command", async () => {
    expect(ctx.state.procs?.cli).toHaveProperty("hello");
    expect(await (ctx.state.procs?.cli as any).hello(ctx, null, { name: "Ada" })).toEqual({ hello: "Ada", fib: 55 });
});

// ─── the guards ───────────────────────────────────────────────────────────────

test("a capital letter marks a type — it is the one file that is not a function", () => {
    // notes/Note.ts is `types.notes.Note`. No `$` prefix, because `$` in this
    // grammar means "a loader parses this file"; a type is never loaded at all.
    const note = ctx.fns.procs.project.classify({ rel: "notes/Note.ts" });
    expect(note.kind).toBe("type");
    expect((note as any).typeName).toBe("Note");

    // `$type_Name.ts` still means the same thing — the escape hatch for when
    // `Name.ts` would be the same file as a function on a case-insensitive
    // filesystem (`db/query.ts` and `Query`).
    expect(ctx.fns.procs.project.classify({ rel: "db/$type_Query.ts" }).kind).toBe("type");
});

test("a module's state lives under the module's own name", () => {
    // `<module>/State.ts` types ctx.state.<module> — so where a module keeps its
    // state is never a question, and no module can claim a key belonging to
    // another. A module is either a slot or the parent of slots, never both;
    // dev.lint refuses the overlap.
    const state = ctx.fns.procs.project.classify({ rel: "notes/State.ts" });
    expect(state.kind).toBe("type");
    expect((state as any).typeName).toBe("State");

    // the framework's own, moved with the rule: ctx.state.procs?.events.presence, not
    // ctx.state.presence.
    ctx.fns.procs.events.join({});
    expect([...(ctx.state.procs?.events?.presence ?? new Map()).keys()]).toEqual(["local"]);
});

test("the generated types assemble ctx.state and Session from the modules", async () => {
    await ctx.fns.procs.dev.genTypes({});
    const d = await Bun.file(ROOT + "/src/ctx_ns.d.ts").text();
    // ctx.state.<module>, nested the way names nest…
    expect(d).toContain("interface CtxState {");
    expect(d).toMatch(/notes: import\("[^"]*notes\/State"\)\.State;/);
    expect(d).toContain('auth: import("../../src/procs/auth/State").State;');
    // …and one Session, the framework's base plus every module's contribution —
    // a module adds fields by shipping Session.ts, nobody overrides the type.
    expect(d).toMatch(/type Session = import\("[^"]*Session"\)\.Session & types\.greet\.Session;/);
});

test("the REPL is gated by a token this run signed, not by a shared secret", async () => {
    // A JWT with `kind: "repl"` — single-purpose by construction: auth.authenticate
    // refuses any token that carries a kind, so this one can never pass for a
    // session cookie.
    const token = await ctx.fns.procs.repl.token({});
    expect((await ctx.fns.procs.auth.verify({ token }))?.kind).toBe("repl");
    // …and `auth.authenticate` — which reads the session cookie — refuses it.
    const asCookie = new Request("http://localhost/", { headers: { cookie: `session=${token}` } });
    expect(await ctx.fns.procs.auth.authenticate({ req: asCookie })).toBeNull();

    // No token, wrong token, a session token: all refused.
    const call = (headers?: Record<string, string>) =>
        ctx.fns.procs.http.dispatch({ method: "POST", url: "/procs/repl", body: "1 + 1", headers });
    expect((await call()).status).toBe(403);
    expect((await call({ authorization: "Bearer nonsense" })).status).toBe(403);
    const session = await ctx.fns.procs.auth.sign({ sub: "u1", name: "One" });
    expect((await call({ authorization: `Bearer ${session}` })).status).toBe(403);

    // With it, the endpoint evaluates in this process.
    const ok = await call({ authorization: `Bearer ${token}` });
    expect(ok.status).toBe(200);
    expect((await ok.json() as any).return).toBe(2);
});

test("a bundle keeps its baked list when it mounts something at runtime", async () => {
    // A bundle has no filesystem to scan. It still mounts things while running —
    // the project a workspace supervises — and a scan then finds only that, so
    // boot.load ADDS to the baked list instead of replacing it. (Replacing it is
    // how a bundled workspace served the framework's routes and none of its own.)
    const before = (ctx.state.procs.boot as any).entries.length;
    (ctx.state.procs.boot as any).baked = (ctx.state.procs.boot as any).entries;
    await ctx.fns.procs.boot.load({});
    expect((ctx.state.procs.boot as any).entries.length).toBeGreaterThanOrEqual(before);
    expect((await ctx.fns.procs.http.dispatch({ url: "/math/10" })).status).toBe(200);
    delete (ctx.state.procs.boot as any).baked;
});

test("the production build runs the same loaders over a baked list", async () => {
    // dev.manifest freezes what the scan found — every entry, with its module
    // already imported — and the prod entry hands that list to boot.apply. So a
    // bundle and a dev process disagree about nothing: one implementation of
    // what a `$route_` or a `$hook_` means, two ways of getting the list.
    const { out, entries, imported } = await ctx.fns.procs.dev.manifest({ out: `${ROOT}/.runtime/manifest.test.ts` });
    const src = await Bun.file(out).text();
    expect(entries).toBeGreaterThan(imported);          // types are listed, not imported
    expect(src).toContain("export const entries: any[] = [");
    expect(src).toMatch(/"kind":"route"/);
    expect(src).toMatch(/fn: f\d+ }/);                  // each runnable entry carries its import
    expect(src).not.toContain("routeDefs");             // no second vocabulary for the same thing
});

test("an extension point is declared by a file, and its name is a path", async () => {
    // `ui/$point_chrome.ts` in the framework declares `ui.chrome`; `notes/$point_ready.ts`
    // in the fixture declares `notes.ready`. A hook answers by that full name, so
    // the point has an owner and a typo has a message instead of silence.
    const points = ctx.fns.procs.hooks.list({});
    expect(points["procs.ui.chrome"]!.declaredBy).toBe("procs.ui");
    expect(points["notes.ready"]).toMatchObject({ declaredBy: "notes" });
    expect(points["notes.ready"]!.answeredBy.sort()).toEqual(["app", "greeter"]);

    // Running a point nobody declared answers with nothing — and says so once.
    expect(await ctx.fns.procs.hooks.run({ name: "notes.raedy" })).toEqual([]);
});

test("the framework lives under its own name, and overrides are explicit", async () => {
    // Every core module is named by its path like everything else, so the good
    // short names are free for an app: the fixture owns `notes`, `math` and
    // `greeter` while the framework is `procs.*`.
    expect(typeof fns.procs.http.dispatch).toBe("function");
    expect(typeof fns.procs.ui.layout).toBe("function");
    expect(fns.http).toBeUndefined();
    expect(fns.ui).toBeUndefined();

    // Its state and types follow the same path.
    expect(ctx.state.procs.http.routes["/procs/modules"]).toBeDefined();

    // And nothing is replaced by a name collision: the shell an app gets is
    // chosen — its own `ui.layout` if it ships one, the framework's otherwise.
    const page = await (await ctx.fns.procs.http.dispatch({ url: "/math", headers: { accept: "text/html" } })).text();
    expect(page).toContain("<!doctype html>");
});

test("a function knows its own name, module and file — and its docstring", () => {
    // Metadata lives on the function object, the way a Clojure var carries its
    // own: put there by the fn loader, read from inside via `this.meta` (the
    // ctx.fns Proxy calls with `this` = the function) and from outside via
    // dev.doc / dev.where.
    expect(fns.notes.whoami({})).toMatchObject({
        name: "notes.whoami", module: "notes", fn: "whoami", rel: "notes/whoami.ts",
    });

    // The docstring is the comment the file opens with — nothing new to write.
    const doc = ctx.fns.procs.dev.doc({ name: "procs.db.select" });
    expect(doc.doc).toContain("Run a SELECT");
    expect(ctx.fns.procs.dev.where({ name: "procs.db.select" }).abs).toContain("/src/procs/db/select.ts");

    // …and the image is searchable by name or by doc text.
    expect(ctx.fns.procs.dev.doc({ q: "own metadata" }).map((m: any) => m.name)).toContain("notes.whoami");
});

test("a point can be a family, for providers that name themselves", async () => {
    // `$point_<name>.ts` exporting `{ family: true }` covers `<module>.<name>.*`
    // — the open-ended case, where the point is a protocol and the suffix says
    // who answers it. Without it every provider would need its own declaration.
    const { collectStateFile } = await import("./procs/boot/load");
    const decl = { ...ctx.fns.procs.project.classify({ rel: "notes/$point_backend.ts" }), module: "notes", root: "app", fn: { family: true } };
    await collectStateFile(ctx, decl, ROOT + "/src/notes/State.ts");   // any file: the loader reads entry.fn
    expect(ctx.state.procs.hooks!.points!["notes.backend"]).toMatchObject({ family: true });

    // A hook answering a member of the family is accepted by lint…
    const lint = await ctx.fns.procs.dev.lint({ silent: true });
    expect(lint.ok).toBe(true);
    delete ctx.state.procs.hooks!.points!["notes.backend"];
});

test("a hot-swapped function keeps its metadata, and a deleted route leaves the table", async () => {
    // Two things that only a live process can be wrong about, and both were:
    // reload used to register a bare function (no `meta`, so dev.doc/where went
    // blank on exactly the functions you are working on), and a rebuilt route
    // table used to keep a route whose file was gone.
    const abs = ROOT + "/src/math/sum.ts";
    await ctx.fns.procs.repl.load({ name: "math.sum" });
    expect((ctx.state.registry as any).math.sum.meta).toMatchObject({ name: "math.sum", module: "math", abs });
    expect(ctx.fns.procs.dev.where({ name: "math.sum" }).rel).toBe("math/sum.ts");

    // The table is rebuilt from what the scan finds now, in a draft that starts
    // empty — so a route with no file behind it cannot survive the swap.
    ctx.state.procs.http.routes["/gone"] = { GET: () => "stale" };
    await ctx.fns.procs.http.loadRoutes({});
    expect(ctx.state.procs.http.routes["/gone"]).toBeUndefined();
    expect((await ctx.fns.procs.http.dispatch({ url: "/math/10" })).status).toBe(200);   // the real ones survive
});

test("the fixture passes the namespace lint", async () => {
    const { ok, errors } = await ctx.fns.procs.dev.lint({ silent: true });
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
});

test("every kind of file in the fixture was classified, and none was skipped by mistake", async () => {
    const entries = await ctx.fns.procs.project.scan({});
    const mine = entries.filter((e: any) => e.abs.includes("/test-proc/"));
    const kinds = new Set(mine.map((e: any) => e.kind));
    for (const kind of ["fn", "route", "middleware", "config", "migration", "cli", "hook", "lifecycle", "type", "phrase"]) {
        expect([...kinds]).toContain(kind);
    }
    // The entry point is reserved, never registered.
    expect(mine.find((e: any) => e.fileName === "$main.ts")?.kind).toBe("skip");
});

// ─── the authentication mechanism ─────────────────────────────────────────────
// Mechanism only: the framework signs, verifies and reads a cookie. Who may come
// in is the app's, which is why there is no login here to test.

test("a token round-trips, and a tampered one is nobody", async () => {
    const token = await ctx.fns.procs.auth.sign({ sub: "ada", name: "Ada Lovelace" });
    expect(await ctx.fns.procs.auth.verify({ token })).toMatchObject({ sub: "ada", name: "Ada Lovelace" });
    expect(await ctx.fns.procs.auth.verify({ token: token.slice(0, -3) + "aaa" })).toBe(null);
    expect(await ctx.fns.procs.auth.verify({ token: "not.a.token" })).toBe(null);
});

test("an expired token is refused without asking anything else", async () => {
    const token = await ctx.fns.procs.auth.sign({ sub: "ada", name: "Ada", seconds: -1 });
    expect(await ctx.fns.procs.auth.verify({ token })).toBe(null);
});

test("a single-purpose token carries its purpose", async () => {
    // `kind` is what keeps an emailed link from being a session: the same key
    // signs both, and only the claim tells them apart.
    const link = await ctx.fns.procs.auth.sign({ sub: "ada", name: "Ada", kind: "magic", jti: "one-use" });
    expect(await ctx.fns.procs.auth.verify({ token: link })).toMatchObject({ kind: "magic", jti: "one-use" });
    const session = await ctx.fns.procs.auth.sign({ sub: "ada", name: "Ada" });
    expect((await ctx.fns.procs.auth.verify({ token: session }))!.kind).toBeUndefined();
});

test("the cookie is HttpOnly and SameSite, and clearing it expires it", () => {
    const set = ctx.fns.procs.auth.cookie({ token: "t", url: "http://localhost/" });
    expect(set).toContain("HttpOnly");
    expect(set).toContain("SameSite=Lax");
    expect(set).not.toContain("Secure");                       // localhost is not https
    expect(ctx.fns.procs.auth.cookie({ token: "t", url: "https://x/" })).toContain("Secure");
    expect(ctx.fns.procs.auth.cookie({ url: "http://localhost/" })).toContain("Max-Age=0");
});

test("authenticate reads the cookie, and nothing else", async () => {
    const token = await ctx.fns.procs.auth.sign({ sub: "ada", name: "Ada" });
    const req = (cookie: string) => new Request("http://localhost/", { headers: { cookie } });
    // The cookie's NAME is the app's (config), so the test asks for it rather
    // than assuming — two apps on one host each have their own.
    const cookie = ctx.fns.procs.config.resolve({ module: "procs/auth" }).cookie;
    expect(await ctx.fns.procs.auth.authenticate({ req: req(`${cookie}=${token}`) })).toMatchObject({ sub: "ada" });
    expect(await ctx.fns.procs.auth.authenticate({ req: new Request("http://localhost/") })).toBe(null);
});

test("auth has a config schema — the mechanism's own, not an app's policy", () => {
    const cfg = ctx.fns.procs.config.resolve({ module: "procs/auth" });
    expect(cfg.days).toBe(30);
    expect(cfg.publicKey).toBe("");                            // the federation seam, empty by default
    expect(Object.keys(cfg).sort()).toEqual(["cookie", "days", "publicKey"]);
});

// ─── the browser dependencies are the framework's ─────────────────────────────

test("htmx is served by the framework, not fetched from a CDN", async () => {
    const res = await ctx.fns.procs.http.dispatch({ url: "/procs/ui/htmx.js" });
    expect(res.status).toBe(200);
    expect((await res.text()).length).toBeGreaterThan(10_000);

    const page = await (await ctx.fns.procs.http.dispatch({ url: "/math", headers: { accept: "text/html" } })).text();
    expect(page).toMatch(/src="\/procs\/ui\/htmx\.js\?v=\d+"/);
    expect(page).not.toContain("unpkg.com");                   // nothing third-party in the load path

    // Every asset the layout links is a route this process serves: the head is
    // written in the framework's own names (`/procs/…`), not the ones from before
    // the move, so nothing in the load path 404s.
    for (const url of [...page.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map(m => m[1]!))
        expect([url, (await ctx.fns.procs.http.dispatch({ url })).status]).toEqual([url, 200]);
});

// ─── $loaders ─────────────────────────────────────────────────────────────────

test("a module owns a kind by shipping $loader_<kind>.ts", () => {
    // The greeter brought `phrase`; the framework has no idea what a phrase is.
    expect(Object.keys((ctx.state as any).procs?.boot?.loaders)).toContain("phrase");
    expect(typeof (ctx.state as any).procs?.boot?.loaders.phrase).toBe("function");   // a loader is a function like everything else
});

test("the loader — not the framework — decides what its files become", async () => {
    const entries = await ctx.fns.procs.project.scan({});
    const phrase = entries.find((e: any) => e.fileName === "$phrase_polite.json")!;
    expect(phrase.kind).toBe("phrase");        // the kind IS what its owner called it
    expect((phrase as any).name).toBe("polite");

    // …and what it produced is what the loader chose to write, keyed by the
    // module and carrying the path inside the src that shipped it.
    expect((ctx.state as any).greeter.phrases["greeter:polite"]).toMatchObject({
        name: "polite", module: "greeter", rel: "greeter/$phrase_polite.json",
        resource: { text: "good day" },
    });
});

test("a loader validates, and says which file was wrong", async () => {
    const bad = `${process.env.TMPDIR ?? "/tmp"}/$phrase_rude.json`;
    await Bun.write(bad, JSON.stringify({ nope: 1 }));
    const loader = (ctx.state as any).procs?.boot?.loaders.phrase;
    const entry = { name: "rude", module: "greeter", projectRel: "$phrase_rude.json", abs: bad };
    expect(loader(ctx, null, { entries: [entry] })).rejects.toThrow(/\$phrase_rude\.json/);
});

test("a file whose kind nobody owns keeps its name and is reported, not guessed at", () => {
    // classify reads a name; it never asks who owns the kind. So the prefix is
    // the kind, and "nobody owns it" is a question answered at load time — with
    // the file named in the log — instead of the file quietly meaning nothing.
    const entry = ctx.fns.procs.project.classify({ rel: "greeter/$nobodyowns_thing.json" });
    expect(entry.kind).toBe("nobodyowns");
    expect((entry as any).name).toBe("thing");
});

test("the framework's own kinds cannot be claimed", async () => {
    const { RESERVED_KINDS } = await import("./procs/boot/load");
    for (const kind of ["route", "migration", "config", "hook", "loader"]) {
        expect(RESERVED_KINDS.has(kind)).toBe(true);
    }
});

// Where plugins come from is a setting, and a process must be able to come up
// with none. The default is the agent's skill directories — a laptop
// convenience that makes the composition depend on whose machine it is, which
// is wrong on a deploy, in a test, and in any demo of what a fresh clone does.
test("where plugins are looked for is a setting, and it can be nowhere", async () => {
    const paths = async (env: Record<string, string>) =>
        (await ctx.fns.procs.env.fork({ mode: "test", env: { ...ctx.env, ...env } }).fns.procs.modules.paths({}))
            .map((p: any) => p.dir);

    const byDefault = await paths({});
    const none = await paths({ PROCS_PLUGINS: "" });

    // Nothing out of a home folder when the setting is empty…
    expect(none.every((d: string) => !d.startsWith(process.env.HOME + "/."))).toBe(true);
    expect(none.length).toBeLessThanOrEqual(byDefault.length);
    // …and what the host itself named on its path is still there: that is the
    // host's own library, not a catalogue anybody opts into.
    expect(none.length).toBeGreaterThan(0);
});
