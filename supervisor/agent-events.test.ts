import { test, expect } from 'bun:test';
import { agentEvents } from './agent-events';

test('SSE sends one snapshot, entry/doc deltas and replays a reconnect cursor', async () => {
    const first = { id: '1', model: [{ role: 'user', content: 'large image history' }] };
    let listener: (value: any) => void = () => {};
    const view = { value: { entries: [first], docs: { 'pi.live': {} } }, subscribe(fn: any) { listener = fn; return () => {}; } };
    const events = agentEvents(view);
    const reader = events.response(new Request('http://local/events'), { configured: true }).body!.getReader();
    const read = async (source = reader) => new TextDecoder().decode((await source.read()).value);
    let reconnect: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
        const snapshot = await read();
        expect(snapshot).toContain('"type":"snapshot"');
        const cursor = snapshot.split('\n')[0]!.slice(4);
        listener({ entries: [first], docs: { 'pi.live': { run: 'active' } } });
        const delta = await read();
        expect(delta).toContain('"entries":[]');
        expect(delta).not.toContain('large image history');
        reconnect = events.response(new Request('http://local/events', { headers: { 'last-event-id': cursor } }), {}).body!.getReader();
        expect(await read(reconnect)).toContain('metadata');
        expect(await read(reconnect)).toBe(delta);
        const second = { id: '2', model: [] };
        listener({ entries: [first, second], docs: { 'pi.live': {} } });
        const appended = await read();
        expect(appended).toContain('"start":1');
        expect(appended).toContain('"id":"2"');
        listener({ entries: [], docs: {} });
        expect(await read()).toContain('"start":0');
    } finally { await reader.cancel(); await reconnect?.cancel(); events.close(); }
});
