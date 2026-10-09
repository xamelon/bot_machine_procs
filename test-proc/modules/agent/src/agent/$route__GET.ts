// Excluded in workspace.json, so this file is never opened: the route it would
// have added does not exist, and the top-level code of the module never runs.
export default function (_ctx: Context, _session: Session | null, _opts: {}): string {
    return "agent";
}
