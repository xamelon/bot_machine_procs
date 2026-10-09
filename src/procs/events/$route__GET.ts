// GET /events — long-lived Server-Sent Events stream.
// Every page opens one; the server pushes reload / custom events down it. The
// stream doubles as presence: it begins when a tab opens and ends when it
// closes, which is a better answer to "who is here" than anything a heartbeat
// could give.
export default async function (ctx: Context, session: Session, opts: { req: Request }) {
    let cancelStream = () => {};
    const stream = new ReadableStream({
        start(controller) {
            const enc = new TextEncoder();
            let closed = false;
            let keepalive: ReturnType<typeof setInterval> | undefined;
            let unsub = () => {};
            let leave = () => {};
            const cleanup = () => {
                if (closed) return;
                closed = true;
                if (keepalive) clearInterval(keepalive);
                leave();
                unsub();
                try { controller.close(); } catch { /* already closed */ }
            };
            cancelStream = cleanup;
            const send = (e: any) => {
                if (closed) return;
                try { controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`)); }
                catch { cleanup(); }
            };
            send({ type: "hello", serverStart: (ctx.state as any).serverStart });
            unsub = ctx.fns.procs.events.subscribe({ handler: send });
            // The stream is also the presence: it lasts exactly as long as the tab.
            leave = ctx.fns.procs.events.join({});
            keepalive = setInterval(() => {
                try { controller.enqueue(enc.encode(`: ping\n\n`)); } catch { cleanup(); }
            }, 25_000);
            if (opts.req.signal.aborted) cleanup();
            else opts.req.signal.addEventListener("abort", cleanup, { once: true });
        },
        cancel() { cancelStream(); },
    });
    return new Response(stream, {
        headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache, no-transform",
            "connection": "keep-alive",
        },
    });
}
