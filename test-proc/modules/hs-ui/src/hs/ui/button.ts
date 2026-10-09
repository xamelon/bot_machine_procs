// The name is the path: hs/ui/button.ts is ctx.fns.hs.ui.button, whatever the
// folder or package that delivered it is called.
export default function (_ctx: Context, _session: Session | null, opts: { label: string }): string {
    return `<button>${opts.label}</button>`;
}
