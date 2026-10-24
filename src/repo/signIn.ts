// Start "Connect GitHub" by signing in (OAuth device flow): ask GitHub for a
// one-time code the operator enters at github.com/login/device. Scope `repo` is
// what listing private repositories and adding a deploy key need; the token it
// yields lives only until the key is added (see State).
export default async function (ctx: Context, _session: Session | null, _opts: {}) {
    const clientId = ctx.fns.procs.config.resolve({ module: "repo" }).githubClientId;
    if (!clientId) throw new Error("No GitHub OAuth App: set GITHUB_CLIENT_ID, or connect manually");
    const data = await ctx.fns.repo.githubCall({ site: true, path: "/login/device/code", body: { client_id: clientId, scope: "repo" } });
    if (!data.device_code) throw new Error(data.error === "device_flow_disabled" ? "Device Flow is off for this OAuth App: enable it in its settings on GitHub" : `GitHub: ${data.error_description || data.error || "no device code"}`);
    const state = (ctx.state.repo ??= {});
    state.github = {
        deviceCode: data.device_code,
        userCode: data.user_code,
        verificationUri: data.verification_uri,
        interval: Number(data.interval) || 5,
        expiresAt: Date.now() + (Number(data.expires_in) || 900) * 1000,
    };
    return { userCode: data.user_code, verificationUri: data.verification_uri };
}
