// A named extension point of the app's own: `hooks.run({ name: "ready" })` fans
// out to every handler registered under it, whoever registered them. This is how
// a module extends a host that has never heard of it.
export default function (_ctx: Context, _session: Session | null, _opts?: {}): string {
    return "app";
}
