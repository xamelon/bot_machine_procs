// Download/upload bodies are consumed before returning, so the timeout covers
// both headers and the full transfer. Do not use for platform API pacing.
export default async function (ctx: Context, _session: Session | null, opts: { url: string; init?: BunFetchRequestInit }) {
    const config = ctx.fns.procs.config.resolve({ module: 'bot' });
    const timeout = AbortSignal.timeout(Math.max(1, config.requestTimeoutMs));
    const signal = opts.init?.signal ? AbortSignal.any([opts.init.signal, timeout]) : timeout;
    const response = await fetch(opts.url, { ...opts.init, signal });
    const bytes = await response.arrayBuffer();
    return new Response([101, 204, 205, 304].includes(response.status) ? null : bytes, { status: response.status, statusText: response.statusText, headers: response.headers });
}
