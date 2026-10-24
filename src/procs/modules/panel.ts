// The module manager: mounted containers, missing declarations and the catalogue.
// UI primitives own the controls and layout; module-specific details live in modules.css.
export default async function (ctx: Context, _session: Session | null, opts: { message?: string; error?: string }): Promise<string> {
    const ui = ctx.fns.procs.ui;
    const esc = (text: any) => ui.escape({ text });
    const all = ctx.fns.procs.modules.list({});
    const mounted = all.filter(m => m.plugin);
    const parts = all.filter(m => !m.plugin);
    const declared = await ctx.fns.procs.modules.readDeclared({ workdir: ctx.fns.procs.project.workdir({}) });
    const missing = Object.entries(declared).filter(([name, config]) => config !== false && !mounted.some(m => m.name === name)) as Array<[string, Record<string, any>]>;
    const catalog = await ctx.fns.procs.modules.catalog({});
    const failed = Object.entries((ctx.state.procs.lifecycle?.failed ?? {}) as Record<string, string>);

    const skill = (name: string) => ui.link({
        href: `/procs/modules/skill?name=${encodeURIComponent(name)}`,
        children: ui.badge({ text: "skill", tone: "success" }),
    });
    const namespace = (name: string) => `<span ${ui.attr({ role: "namespace" })}>${ui.text({ children: ui.code({ code: name }), size: "supporting", tone: "secondary" })}</span>`;
    const directory = (dir: string) => `<div class="module-entry__directory" ${ui.attr({ role: "dir" })} title="${esc(dir)}">${ui.code({ code: dir })}</div>`;
    const label = (text: string, href?: string) => `<span ${ui.attr({ role: "label" })}>${href ? ui.link({ href, label: text }) : ui.text({ text, weight: "medium" })}</span>`;
    const turnOff = (name: string) => ui.button({ action: "turn-off", label: "Turn off", entity: "module", id: name, post: "/procs/modules/remove", vals: { name }, tone: "danger" });

    const module = (p: (typeof mounted)[number]) => ui.item({
        entity: "module", id: p.name, status: "on", class: "module-entry",
        start: ui.icon({ name: p.icon, tone: "secondary" }),
        heading: ui.hStack({ gap: 2, align: "center", wrap: true, body: [
            label(p.label, p.tab ? `/${p.namespaces[0] ?? p.name}` : undefined),
            namespace(p.namespaces.join(" ")),
            ui.badge({ text: p.source, role: "source" }),
            p.tab ? ui.badge({ text: "tab", tone: "info" }) : "",
            p.skill ? skill(p.name) : "",
            ...p.provides.map(s => ui.badge({ text: `service:${s}`, tone: "warning" })),
            p.preview ? ui.badge({ text: `previews ${p.preview.files}`, tone: "info" }) : "",
            p.fns.length ? ui.badge({ text: `${p.fns.length} fns` }) : "",
        ].join("") }),
        description: p.description,
        body: directory(p.dir) + (Object.keys(p.config).length ? ui.text({ as: "div", size: "supporting", tone: "secondary", children: ui.code({ code: JSON.stringify(p.config) }) }) : ""),
        end: !p.optional ? ui.text({ text: "always on", size: "supporting", tone: "disabled" }) : turnOff(p.name),
    });

    const gap = ([name, config]: [string, Record<string, any>]) => ui.item({
        entity: "module", id: name, status: "declared", class: "module-entry",
        start: ui.icon({ name: "ph-warning-circle", tone: "warning" }),
        heading: namespace(name),
        body: `<div ${ui.attr({ role: "source" })}>${ui.code({ code: config.git ?? config.path ?? "no git or path — and nothing by that name in the catalogue" })}</div>`,
        end: ui.hStack({ gap: 2, align: "center", body: (config.git ? ui.button({ action: "fetch", label: "Fetch", entity: "module", id: name, post: "/procs/modules/fetch", vals: { name } }) : "") + turnOff(name) }),
    });

    const available = (p: (typeof catalog)[number]) => ui.item({
        entity: "module", id: p.name, status: "off", class: "module-entry",
        start: ui.icon({ name: p.icon, tone: "secondary" }),
        heading: ui.hStack({ gap: 2, align: "center", wrap: true, body: label(p.label) + namespace(p.name) + (p.skill ? skill(p.name) : "") }),
        description: p.description, body: directory(p.dir),
        end: ui.button({ action: "turn-on", label: "Turn on", size: "sm", entity: "module", id: p.name, post: "/procs/modules/add", vals: { name: p.name } }),
    });

    return ui.page({
        page: "modules", title: "Modules",
        lead: `A module is a folder: its functions are a library, a ${ui.code({ code: "GET /namespace" })} route makes it a tab, a ${ui.code({ code: "SKILL.md" })} makes it a skill for the agent. The workspace's own are always on; the rest are named in ${ui.code({ code: "workspace.json" })}.`,
        main: [
            failed.length ? ui.banner({ tone: "error", body: `did not start: ${failed.map(([name, why]) => `${name} — ${why}`).join(" · ")}` }) : "",
            opts.error ? ui.banner({ body: opts.error, tone: "error" }) : "",
            opts.message ? ui.banner({ body: opts.message, tone: "success" }) : "",
            ui.card({ title: `${mounted.length} on`, body: mounted.map(module).join("") || "no plugins on — the catalogue is below" }),
            missing.length ? ui.card({ title: `${missing.length} declared, not mounted`, body: missing.map(gap).join("") }) : "",
            ui.card({ title: `${catalog.length} available — off`, body: catalog.map(available).join("") || "every module on this machine is already on" }),
            ui.card({ title: `${parts.length} always on — this process`, body: parts.map(module).join("") }),
            `<form class="module-add" ${ui.attr({ form: "module-add" })} hx-post="/procs/modules/add" hx-target="#main" hx-swap="innerHTML">${ui.input({ name: "name", placeholder: "name" })}${ui.input({ name: "git", placeholder: "https://github.com/acme/module (leave empty for a platform module)" })}${ui.button({ action: "add", label: "Add", variant: "primary", type: "submit" })}</form>`,
        ].join(""),
    });
}
