// A `GET /<namespace>` route is what makes a module a tab in a host that draws
// one. Here it is simply the module's own page.
export default function (ctx: Context, _session: Session, _opts: { req: Request }) {
    return { title: "greeter", main: ctx.fns.procs.ui.page({ page: "greeter", title: "Greeter", main: ctx.fns.greeter.say({ to: "world" }) }) };
}
