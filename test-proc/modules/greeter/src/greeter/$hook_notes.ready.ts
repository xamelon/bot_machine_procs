// The module answering the host's extension point. The host never named this
// module; it asked "who is ready" and this is one of the answers.
export default function (_ctx: Context, _session: Session | null, _opts?: {}): string {
    return "greeter";
}
