---
name: screen
description: The semantic screen the agent can read either from server-rendered HTML or from the person's live tab — plus actions that open, click, fill, caption and tour the live page. Use screen.read({ mode: "server", url }) for quiet acceptance and screen.read({ mode: "browser" }) for final/live browser facts.
---

# screen

Server reads need no browser: `screen.read({ mode: "server", url })` dispatches
the route in-process and parses its HTML. Live reads and acting verbs use the tab
the person already has open: `screen.eval` pushes code down the event stream and
the tab answers at `POST /screen/result`. Reading never navigates; `screen.open`
does, and every acting verb moves a visible pointer and lights its target.

```ts
await ctx.fns.screen.open({ url: "/ehr" });                       // navigate + return browser snapshot
await ctx.fns.screen.read({ mode: "server", url: "/ehr" });       // quiet semantic acceptance
await ctx.fns.screen.open({ url: "/ehr", read: false });          // navigate without snapshot
await ctx.fns.screen.read({ mode: "browser", tabId, waitFor: { action: "save", status: "done" } });
await ctx.fns.screen.snapshot({ name: "checkpoint" });           // remember this read in process memory
await ctx.fns.screen.diff({ from: "checkpoint" });               // only what changed since it
await ctx.fns.screen.say({ text: "this is the one", entity: "patient", id: "seed-anna" });
```

## The snapshot contract

Both modes return `page`, readable `text`, `headings`, `links`, `markers`,
`entities`, `actions`, `forms`, `fields`, `roles`, `sections`, structured
`tables`, and `diagnostics`. Read verbs from `actions`, things from `entities`,
and rows from `tables`; `diagnostics` must be empty before claiming semantic
acceptance. Browser markers additionally carry `visible` and `rect`.

When several workspace tabs exist, call `screen.liveTabs({})`, choose its stable
`tabId`, and pass that id to `read`, `open` or low-level `eval`; never rely on the
first tab to answer. `waitFor` waits for marker state without sleeping:

```ts
await ctx.fns.screen.read({ mode: "browser", tabId,
  waitFor: { action: "save", status: "done" }, timeoutMs: 5000 });
```

A descriptor that matches multiple elements is an error with candidates. Narrow
it with `id`, `entity`, `form` or `field`; do not accept whichever came first.

## The two rules every verb follows

**1. Markers, never selectors.** A target is addressed by the `data-*` markers
`procs.ui.attr` emits — `entity`+`id`, `action`, `form`, `role` — read off
`screen.read({ mode: "browser" })`, not guessed and never a CSS path. The same
base snapshot is returned by server mode. That is what makes
a call survive a restyle.

**2. The interactive thing does the work; the marker is what lights up.** A
marker usually sits on a row while the link or button lives inside it —
`click` and `open` find the thing that actually does something and press that,
and highlight the row the step named.

Verbs: `open` (url or a marked entity's own link) · `openTab({ plugin })` ·
`click` · `fill` · `submit` · `point` (light up, explain) · `say` (caption) ·
`read` (`mode: "server" | "browser"`; URL required only for server mode) ·
`snapshot` (named ephemeral baseline) · `diff` (added/removed/
updated markers since a snapshot, or between two reads) ·
`text` · `tabs` · `where` (where the person is, no round trip) ·
`eval` (the raw wire).

## Atomic open flows

When showing a page and immediately demonstrating a bounded interaction, keep it
in one selected tab and one `screen.open` call:

```ts
await ctx.fns.screen.open({ url: "/ehr", tabId, actions: [
  { fill: { form: "patient-search", values: { q: "Maya" }, show: false } },
  { click: { action: "search", show: false } },
  { waitFor: { entity: "patient", id: "recovery.maya", timeoutMs: 5000 } },
] });
```

Allowed steps are only `fill`, `click`, `submit`, and `waitFor`; there is no
arbitrary JS. Steps run in order through the normal semantic resolver, a failure
names its 1-based step, every wait defaults to 5s and is capped at 30s, and the
whole open flow is capped at 60s. The return is the final browser snapshot plus
`steps`. Use this for one coherent demonstration, not for quiet build checks.


## tour.play — the scripted walk, and its pre-flight

A tour is ephemeral and there is one alive at most: an ordered list of steps
handed to the tab, played by the person at their own pace (Back / Next /
Show me / Guide me / **End tour**). A step is one sentence and at most one
thing to do; `open` travels on the way IN, so a sentence is read on the page
it is about.

```ts
await ctx.fns.tour.play({ steps: [
    { say: "Everyone in the box", open: "/ehr" },
    { say: "Open Anna", click: { entity: "patient", id: "seed-anna" } },
] });
```

`tour.review({ steps })` reads the same steps with no browser — per step, is
the target on that page (`screen`/`elsewhere`/`nothing`/`missing`), plus
`missed`: the project pages no step visits. It costs milliseconds and rides on
every `play`; run it before playing anything you composed.

## screen.step — the live tour, one turn at a time

When the walk should adapt — branch on what they press, answer on the way —
do not hand over a scenario. Play ONE step and end your turn:

```ts
await ctx.fns.screen.step({ title: "Тур", say: "Это регистр", open: "/ehr",
    point: { form: "patient-search" } });
```

The person's answer comes back **into the chat** as one line of fact —
`[tour] The user pressed Next on step "…" (/ehr) — your move` — and the reply
is the next `screen.step`, chosen now. `did-it` means they pressed the lit
control themselves; `failed` carries what was looked for, so fix the step or
the screen and step again; *"ended the tour early"* is a goodbye — play no
more steps, close with one line in the chat at most. No message means they
have not pressed yet: never poll, never repeat a step.
