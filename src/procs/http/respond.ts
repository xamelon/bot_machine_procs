// The last thing that happens to a text answer before the socket: gzip it, give
// it an ETag, and answer 304 when the client already has exactly these bytes.
//
//   text/*, application/javascript|json|xml, image/svg+xml   → compressed
//   text/event-stream, binaries, empty bodies                → passed through
//
// A stylesheet here is 240 KB of rules that change when the code changes, not
// when the clock does — the same page reloaded used to pull every byte again.
// The ETag is a hash of the body, so it changes exactly when the bytes do, and
// a client that stored a sheet revalidates in one conditional request. That is
// also what keeps live reload honest: `no-cache` means "ask every time", and the
// answer changes the moment watch.ts rebuilds. `no-store` (the old header) meant
// "do not even keep it", so every navigation paid for the whole file.
//
// The stream is never read here: an SSE answer is exempt by content type, and
// nothing else is allowed to arrive as an unknown-length stream.
export default async function (ctx: Context, session: Session | null, opts: { response: Response; req?: Request }): Promise<Response> {
    const res = opts.response;
    if (!res.body || res.status === 204 || res.status === 304) return res;

    const req = opts.req ?? session?.req;
    if (req?.method === "HEAD") return res;

    const type = res.headers.get("content-type") ?? "";
    if (!COMPRESSIBLE.test(type) || STREAM.test(type)) return res;

    const body = new Uint8Array(await res.arrayBuffer());
    const etag = `"${body.byteLength.toString(36)}-${Bun.hash(body).toString(36)}"`;
    const headers = new Headers(res.headers);
    headers.set("etag", etag);
    headers.set("vary", mergeVary(headers.get("vary"), "accept-encoding"));

    // A response that says `no-store` is not revalidated by anyone, so a 304 for
    // it would be a lie the browser has no reason to ask about.
    if (!/no-store/i.test(headers.get("cache-control") ?? "") && holds(req?.headers.get("if-none-match"), etag)) {
        const out = new Headers(headers);
        out.delete("content-length");
        out.delete("content-encoding");
        return new Response(null, { status: 304, statusText: res.statusText, headers: out });
    }

    const gzipped = acceptsGzip(req?.headers.get("accept-encoding")) && body.byteLength >= MIN_BYTES
        ? await gzip(ctx, etag, body)
        : null;
    if (!gzipped) return new Response(body, { status: res.status, statusText: res.statusText, headers });

    headers.set("content-encoding", "gzip");
    headers.delete("content-length");
    return new Response(gzipped, { status: res.status, statusText: res.statusText, headers });
}

// Compressing the same 240 KB sheet on every request would trade a network cost
// for a CPU one. The key is the ETag, so the entry is valid for exactly as long
// as the bytes it holds; the map is bounded because this process is long-lived.
const MAX_CACHED = 64;

async function gzip(ctx: Context, etag: string, body: Uint8Array): Promise<Uint8Array | null> {
    const cache = ((ctx.state.procs?.http as any).gzip ??= new Map<string, Uint8Array>());
    const hit = cache.get(etag);
    if (hit) { cache.delete(etag); cache.set(etag, hit); return hit; }   // keep it recent
    try {
        const out = new Uint8Array(Bun.gzipSync(body as Uint8Array<ArrayBuffer>));
        cache.set(etag, out);
        while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string);
        return out;
    } catch {
        return null;                          // a client that asked, a server that cannot: send plain
    }
}

function acceptsGzip(header: string | null | undefined): boolean {
    if (!header) return false;
    return header.split(",").some(part => {
        const [name, ...params] = part.trim().toLowerCase().split(";");
        if (name !== "gzip" && name !== "*") return false;
        const q = params.map(p => p.trim()).find(p => p.startsWith("q="));
        return !q || Number(q.slice(2)) > 0;
    });
}

function holds(header: string | null | undefined, etag: string): boolean {
    if (!header) return false;
    if (header.trim() === "*") return true;
    return header.split(",").some(tag => {
        const t = tag.trim().replace(/^W\//, "");
        return t === etag;
    });
}

function mergeVary(current: string | null, value: string): string {
    if (!current) return value;
    const have = current.split(",").map(v => v.trim().toLowerCase());
    return have.includes(value) ? current : `${current}, ${value}`;
}

// `application/*` beyond these three is a file, not a document: a zip or a woff2
// only grows under gzip's overhead and its 304 cannot be judged from a partial read.
const COMPRESSIBLE = /^(text\/|application\/(javascript|json|xml|x-www-form-urlencoded)\b|image\/svg\+xml)/i;
const STREAM = /^text\/event-stream/i;
const MIN_BYTES = 1024;
