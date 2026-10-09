// The name is the path: src/greeter/say.ts is ctx.fns.greeter.say. The folder
// that delivered it (modules/greeter, or a package) names nothing.
export default function (ctx: Context, _session: Session | null, opts: { to: string }): string {
    const phrase = ctx.fns.greeter.phrase({ name: "polite" });
    return `${phrase}, ${opts.to}`;
}
