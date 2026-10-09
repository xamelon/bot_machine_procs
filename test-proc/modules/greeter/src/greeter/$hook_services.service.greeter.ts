// The module supplying a service: it answers the `services.service.*` family
// with how to run one. Shipping this file is the whole declaration — the module
// record says it `provides: ["greeter"]` because of the file name.
export default function (_ctx: Context, _session: Session | null, _opts?: {}) {
    return { cmd: "echo greeting" };
}
