// The chrome seam: an htmx request swaps one element, so anything else on the
// page that must change rides along out of band. A host registers this hook and
// the framework appends whatever it returns to every partial response — which is
// how a tab strip or a patient band stays in step without the framework knowing
// what either of them is.
export default function (_ctx: Context, _session: Session | null, opts: { path: string; oob?: boolean }): string {
    return `<div id="where"${opts.oob ? ` hx-swap-oob="true"` : ""}>${opts.path}</div>`;
}
