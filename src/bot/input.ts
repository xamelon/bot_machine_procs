export default function (ctx: Context, _session: Session | null, opts: {
    name: string; label?: string; value?: string; placeholder?: string; type?: string; required?: boolean; class?: string;
}) {
    const esc = (s: any) => ctx.fns.procs.ui.escape({ text: s });
    const input = ctx.fns.procs.ui.input({ name: opts.name, value: opts.value, placeholder: opts.placeholder, type: opts.type, required: opts.required, class: opts.class });
    if (!opts.label) return input;
    return ctx.fns.procs.ui.field({ label: opts.label, control: input, required: opts.required });
}
