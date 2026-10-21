# screen — the screen two parties look at together, and the tour over it

The agent has no browser. The person has one, open at the app, and everything
the agent does to what they see goes through this module: read the screen,
open a page, click, fill — and walk somebody through the product a step at a
time. One container, two namespaces:

- **`screen.*`** — the driver. `open`, `openTab`, `click`, `fill`, `submit`,
  `readScreen`, `point`, `say`, `text`, `tabs`, `where`, `eval` — verbs over the
  tab that already has this process open, pushed down the SSE stream
  (`GET /procs/events`) and answered at `POST /screen/result`. No CDP, no
  headless Chrome: the runtime is the user's tab.
- **`tour.*`** — the excursion. `play` hands a list of steps to that tab;
  `review` reads the same steps off the pages they name with no browser at all.

## Why it is not part of procs

It used to be `procs/page/*` — framework files, framework routes. But only one
host ever linked its client (`workspace/src/ui/layout.ts`), and of the
framework it used nothing but `http.dispatch`, `project.scan`, `events` and
`ui.escape` — all through `ctx.fns`, no imports. A module that one host mounts
and others do not is a library, not the core; keeping it in the core made every
EHR and portal carry a browser driver they never drive. So: `libs/screen`,
mounted by default (no `optional` flag — a host that does not link the client
just has dormant routes), names `ctx.fns.screen.*` / `ctx.fns.tour.*`, routes
`/screen/*`.

Why the name: the subject is **the screen the agent and the person look at
together** — not the page (that is what `http` serves), not the browser (the
`browser` skill outside this repo drives a real Chrome over CDP; two things
named `browser` in one head is an error both will make), not a viewer. The
browser-side global stays `window.page` (`window.screen` is taken by the DOM)
and the agent's tool names stay `page_open`, `page_read`, `page_click`,
`page_fill` — renaming the wire vocabulary is churn with no meaning attached.

## What a tour is

**A tour is ephemeral, and there is one alive at most.** It is not an artifact
of the project — no `$tour_*.json`, no catalogue, no history. It exists while
somebody is looking at it; a new `play` displaces the old one; a tour from
another sitting does not come back (it survives a reload via sessionStorage,
nothing longer). It is the answer to "show me what you built", spoken over the
live app.

A tour is an ordered list of **steps** plus a cursor (which step the person is
on) and the notes they left. Nothing else — no name, no owner.

**A step is three things and no more** (`src/tour/Step.ts`):

1. **where** — the page it stands on. `open`, and it travels **on the way in**:
   the tour goes there first, then speaks, because a step's sentence describes
   the screen it is about. The button on the step before says where pressing it
   goes ("Take me there →" — with the patient's name when the page is about a
   different one).
2. **what is said** — `say`, one sentence. A step is a unit of reading.
3. **what is done** — at most one of `point` (light up and explain), `click`,
   `fill`, `submit`. Or nothing: a paragraph with a Next button is legal.
   Explaining three parts of one screen is three steps, not one step with three
   highlights.

Invariants: a target is addressed by the `data-*` markers `procs.ui.attr`
emits, never a CSS selector; a step is over when its act **happened** — the
person pressed the control, or pressed "Show me" and it was pressed for them;
the two are the same fact to the tour.

## Who controls it

The person, from the panel — the server's `play` returns as soon as the tour
has started. Next / Back / "Show me" / "Guide me through it" (the tour walks
itself, a bar fills before each move, "I'll click myself" hands it back) / ✕.
A step that cannot be done says so in words and can be stepped over; a failure
also stops the guided clock — a tour must not walk over its own wreckage.

## Where the live tour lives

In memory — `ctx.state.screen.tour`, one record per process, which is what
"one alive" costs to enforce: nothing. No file: the coding agent is a separate
process, but it already enters this one through `.workspace/repl`, so the
state is one call away (`tour.status({})` — the cursor, each step's outcome,
the notes). A file would only buy surviving a restart, and an ephemeral tour
has nothing to survive into. The browser keeps the cursor and its resume key
(sessionStorage), as today.

Every transition beacons the server the way `POST /screen/here` already does —
fire and forget, 204, nobody waits. A step's record is one of three outcomes:

- `done`, with `how`: `clicked` (the person) · `shown` (pressed for them) ·
  `next` (a step with no act)
- `skipped` — stepped over
- `failed` — with the snapshot **taken by the client at the moment of
  failure**: `{ n, url, want, onScreen }`. The server can re-dispatch a url;
  it cannot see the state the person's screen was actually in. A `failed`
  record is a finished bug report, not a flag.

Notes are the second record type in the same file: `{ n, url, said }` — a
"not right" said on the step it is about, accumulated until the end.

## The live tour — guiding as turn-taking (this is the flexible form)

A scripted list freezes the guide out at `play`: targets go stale by the time
the person arrives, nothing can branch, and a question in the middle has
nowhere to go. So the flexible tour is not a data structure at all — it is
**turns**. The guide plays ONE step and returns
(`screen.step({ say, point|click|open, title, to? })` — the same panel, minus
what only a script has: no count, no dots, no Back, no guided mode). The
person's answer hands the floor back: `next`, their own click on the lit
control (`did-it`), `shown` ("Show me"), `skipped`, `stop`, or `failed` — with
what was looked for, said at the moment it happened.

The press travels as a beacon (`POST /screen/press`, like `/screen/here` —
fire and forget, nobody waits on a wire). Two deliveries:

- **`to: "agent"`** → the `screen.press` point; the workspace answers it from
  `agent/$hook_screen.press.ts` by putting a message in the chat agent's queue,
  phrased as the PERSON speaking — `[тур] «…» — человек посмотрел (/ehr) и
  просит следующий шаг` — so the press IS the agent's next turn, the way any
  message is. "stop" arrives too, but as a goodbye, not a move: the person
  ended the tour early, so the agent plays no more steps — at most one closing
  line in the chat.
- otherwise the press lands in `ctx.state.screen.press`, where a guide outside
  the process polls `screen.pressed({})` — reading spends it, one press one
  read.

A `failed` press is a finished bug report (step, url, what was looked for);
the guide fixes the step or the screen (`dev.sync`) and simply steps again —
there is no cursor to rewind because there is no script. `tour.play({ steps })`
stays as sugar for the pre-baked walk, and `review` as its pre-flight.

## review — the tour read without playing it

Same steps, no browser: each step's page is dispatched in-process
(`http.dispatch`), its markers are read (`HTMLRewriter` over `ui.attr`'s
vocabulary), a click is followed through the link it lands on. Per step:
`on` — `screen` / `elsewhere` / `nothing` / `missing`. Plus `missed`: the
project's own GET pages no step ever stood on — the line that catches a tour
of one corner being passed off as the product. It costs milliseconds, so
`play` runs it on the way and returns `missed` with the start.

## Open

- **`point` has nowhere to stand on most screens.** `ui.attr`'s vocabulary has
  `page`, `entity`/`id`, `role`, `action`, `form` — panels have no marker (in
  `libs/ehr`, one `page` marker across 32 `attr` calls). "This is the problem
  list, that is the orders panel" needs section markers first — likely a new
  `section` key in `ui.attr` (a panel is chrome, not a record entity), echoed
  in `review`'s KEYS.
- `ctx.state.screen.tour` + `tour.status`, the step/note beacons,
  `$point_failed` and `play({ at })` are the design above; today the tour
  lives in the browser (sessionStorage) and the server forgets it after
  `play` returns.
- `review` treats a redirect as `missing (302)` — a page that answers with
  "over there" should be followed, the way a click already is.
