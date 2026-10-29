// Bounded SSE replay for an immutable conversation view. Never resend the
// committed transcript on token updates; only changed docs and entry tails.
export function agentEvents(view: { value: any; subscribe: (fn: (value: any) => void) => () => void }) {
    const epoch = crypto.randomUUID();
    let revision = 0;
    let current = view.value;
    const clients = new Set<(frame: string) => void>();
    const history: Array<{ revision: number; frame: string }> = [];
    let bytes = 0;
    const frame = (type: string, data: any) => `id: ${epoch}:${revision}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
    const unsubscribe = view.subscribe(value => {
        if (value === current) return;
        const before = current;
        current = value;
        const prev = before.entries ?? [], next = value.entries ?? [];
        let start = 0;
        while (start < prev.length && start < next.length && prev[start] === next[start]) start++;
        const docs: Record<string, any> = {};
        for (const key of new Set([...Object.keys(before.docs ?? {}), ...Object.keys(value.docs ?? {})])) {
            if (before.docs?.[key] !== value.docs?.[key]) docs[key] = value.docs?.[key] ?? null;
        }
        revision++;
        const message = frame('update', { start, entries: next.slice(start), docs });
        history.push({ revision, frame: message }); bytes += message.length;
        while (history.length > 128 || bytes > 8 * 1024 * 1024) bytes -= history.shift()!.frame.length;
        for (const send of clients) send(message);
    });
    return {
        response(req: Request, metadata: any) {
            let cleanup = () => {};
            const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                    const encoder = new TextEncoder();
                    let closed = false;
                    const send = (message: string) => {
                        if (closed) return;
                        // Disconnect slow readers rather than retaining an unbounded queue.
                        if ((controller.desiredSize ?? 1) < -64) { cleanup(); return; }
                        try { controller.enqueue(encoder.encode(message)); } catch { cleanup(); }
                    };
                    const timer = setInterval(() => send(': ping\n\n'), 25_000);
                    cleanup = () => {
                        if (closed) return;
                        closed = true; clearInterval(timer); clients.delete(send);
                        req.signal.removeEventListener('abort', cleanup);
                        try { controller.close(); } catch {}
                    };
                    const cursor = req.headers.get('last-event-id') ?? '';
                    const [id, raw] = cursor.split(':');
                    const seen = Number(raw);
                    if (id === epoch && Number.isInteger(seen) && seen <= revision && seen >= (history[0]?.revision ?? revision + 1) - 1) {
                        send(`data: ${JSON.stringify({ type: 'metadata', ...metadata })}\n\n`);
                        history.filter(item => item.revision > seen).forEach(item => send(item.frame));
                    } else send(frame('snapshot', { ...current, ...metadata }));
                    if (!closed) clients.add(send);
                    req.signal.addEventListener('abort', cleanup, { once: true });
                    if (req.signal.aborted) cleanup();
                },
                cancel() { cleanup(); },
            });
            return new Response(stream, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', 'x-accel-buffering': 'no' } });
        },
        close() { unsubscribe(); clients.clear(); },
    };
}
