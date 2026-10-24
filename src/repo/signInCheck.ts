// Has the operator entered the code yet? One question to GitHub: `pending`
// (not yet), or `done` with the token kept in memory for picking a repository.
// A refusal, an expired code or a disabled app ends the sign-in with an error.
export default async function (ctx: Context, _session: Session | null, _opts: {}): Promise<"pending" | "done"> {
    const flow = ctx.fns.repo.signInState({});
    if (!flow) throw new Error("No GitHub sign-in in progress: press Connect GitHub again");
    if (flow.token) return "done";
    const clientId = ctx.fns.procs.config.resolve({ module: "repo" }).githubClientId;
    const data = await ctx.fns.repo.githubCall({ site: true, path: "/login/oauth/access_token", body: {
        client_id: clientId, device_code: flow.deviceCode, grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    } });
    if (data.access_token) {
        flow.token = data.access_token;
        // From here the clock is the operator's choice of repository, not the code's.
        flow.expiresAt = Date.now() + 15 * 60_000;
        flow.login = (await ctx.fns.repo.githubCall({ path: "/user", token: flow.token })).login;
        return "done";
    }
    if (data.error === "authorization_pending") return "pending";
    if (data.error === "slow_down") { flow.interval = Number(data.interval) || flow.interval + 5; return "pending"; }
    delete ctx.state.repo?.github;
    const reasons: Record<string, string> = {
        access_denied: "Access was denied on GitHub",
        expired_token: "The code expired: press Connect GitHub again",
        device_flow_disabled: "Device Flow is off for this OAuth App: enable it in its settings on GitHub",
        incorrect_client_credentials: "GitHub does not know this Client ID (GITHUB_CLIENT_ID)",
    };
    throw new Error(reasons[data.error] ?? `GitHub: ${data.error_description || data.error || "sign-in failed"}`);
}
