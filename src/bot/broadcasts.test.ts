import { test, expect } from 'bun:test';
import { testCtx } from '../$test';

async function setup() {
    const ctx = await testCtx();
    const connectionId = ctx.fns.procs.db.select({ sql: "SELECT id FROM bot_channel_connections WHERE public_id = 'conn_echo'" })[0].id;
    const addUser = (externalId: string, name = 'Ada', blocked = false, connection = connectionId) => ctx.fns.procs.db.insert({ into: 'bot_users', values: {
        bot_channel_connection_id: connection, channel: 'echo', external_id: externalId, display_name: name,
        blocked_at: blocked ? new Date().toISOString() : null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    } });
    return { ctx, connectionId, addUser };
}

test('broadcast snapshots a filtered audience, excludes blocked users and other connections, and sends only after confirmation', async () => {
    const { ctx, connectionId, addUser } = await setup();
    addUser('a', 'Ada'); addUser('b', 'Bob'); addUser('blocked', 'Ada', true);
    const other = ctx.fns.bot.saveConnection({ channel: 'echo', name: 'Other', publicId: 'other' });
    addUser('other', 'Ada', false, other.id);
    const draft = ctx.fns.bot.createBroadcast({ connectionId, text: 'Hello <img src=x>', tree: { all: [{ filter: 'core.user.name', op: 'eq', value: 'Ada' }] } });
    expect(draft.recipients).toBe(1);
    expect(await ctx.fns.bot.sendOutbox({})).toEqual({ sent: 0, failed: 0, skipped: 0 });
    addUser('late', 'Ada');
    expect(ctx.fns.bot.startBroadcast({ id: draft.id }).started).toBe(true);
    expect(ctx.fns.bot.startBroadcast({ id: draft.id }).started).toBe(false);
    expect(ctx.fns.bot.pending({}).map((row: any) => row.external_id)).toEqual(['a']);
    expect(ctx.fns.bot.pending({})[0].payload.text).toBe('Hello <img src=x>');
    expect(await ctx.fns.bot.sendOutbox({})).toMatchObject({ sent: 1 });
    expect(ctx.fns.bot.broadcasts({ id: draft.id })[0]).toMatchObject({ recipients: 1, sent: 1, pending: 0, failed: 0 });
});

test('start skips users blocked or deleted since preview and refuses inactive connections', async () => {
    const { ctx, connectionId, addUser } = await setup();
    addUser('blocked'); addUser('deleted'); addUser('ok');
    const draft = ctx.fns.bot.createBroadcast({ connectionId, text: 'Hi' });
    ctx.fns.procs.db.run({ sql: "UPDATE bot_channel_connections SET status = 'disabled' WHERE id = ?", params: [connectionId] });
    expect(() => ctx.fns.bot.startBroadcast({ id: draft.id })).toThrow('not active');
    expect(ctx.fns.bot.pending({})).toHaveLength(0);
    ctx.fns.procs.db.run({ sql: "UPDATE bot_channel_connections SET status = 'active' WHERE id = ?", params: [connectionId] });
    ctx.fns.procs.db.run({ sql: "UPDATE bot_users SET blocked_at = 'now' WHERE external_id = 'blocked'" });
    ctx.fns.procs.db.run({ sql: "DELETE FROM bot_users WHERE external_id = 'deleted'" });
    ctx.fns.bot.startBroadcast({ id: draft.id });
    expect(ctx.fns.bot.broadcasts({ id: draft.id })[0]).toMatchObject({ recipients: 3, pending: 1, skipped: 2 });
});

test('bad input and empty audiences never leave a partial draft', async () => {
    const { ctx, connectionId, addUser } = await setup();
    for (const opts of [
        { text: '' }, { text: 'x'.repeat(4001) }, { text: 'Hi', connectionId: 999 },
        { text: 'Hi', tree: { all: [{ filter: 'unsafe', op: 'eq', value: 'x' }] } }, { text: 'Hi' },
    ]) expect(() => ctx.fns.bot.createBroadcast({ connectionId, ...opts })).toThrow();
    expect(ctx.fns.bot.broadcasts()).toHaveLength(0);
    expect(ctx.fns.procs.db.select({ sql: 'SELECT * FROM bot_outbox_messages' })).toHaveLength(0);
    addUser('u');
    expect(() => ctx.fns.bot.createBroadcast({ connectionId, text: 'Hi', tree: null })).toThrow('Invalid audience filters');
    const draft = ctx.fns.bot.createBroadcast({ connectionId, text: 'Hi' });
    ctx.fns.bot.startBroadcast({ id: draft.id });
    const row = ctx.fns.bot.pending({})[0];
    ctx.fns.bot.failOutbox({ id: row.id, error: 'Rate limit', retryAfter: 10 });
    expect(ctx.fns.bot.broadcasts({ id: draft.id })[0]).toMatchObject({ failed: 1, sent: 0 });
    ctx.fns.bot.ack({ id: row.id });
    expect(ctx.fns.bot.broadcasts({ id: draft.id })[0]).toMatchObject({ failed: 0, sent: 1 });
});

test('broadcast migration can be rolled back and reapplied without affecting ordinary outbox messages', async () => {
    const { ctx, connectionId, addUser } = await setup();
    addUser('u');
    ctx.fns.bot.createBroadcast({ connectionId, text: 'Draft' });
    const now = new Date().toISOString();
    ctx.fns.procs.db.insert({ into: 'bot_outbox_messages', values: { bot_channel_connection_id: connectionId, channel: 'echo', external_id: 'u', idempotency_key: 'ordinary', payload: '{}', created_at: now, updated_at: now } });
    // Everything newer than the broadcast migration is rolled back first, so this
    // test keeps saying what it means when another migration arrives: it is about
    // 004 and its neighbours, not about being the newest file in the tree.
    const newer = [...(ctx.state.procs?.migrate?.list ?? [])].map((m: any) => m.id).sort().filter((id: string) => id > '004_send_limits');
    for (const id of [...newer].reverse()) expect((await ctx.fns.procs.migrate.down({})).rolledBack).toEqual([id]);
    expect((await ctx.fns.procs.migrate.down({})).rolledBack).toEqual(['004_send_limits']);
    expect((await ctx.fns.procs.migrate.down({})).rolledBack).toEqual(['003_broadcasts']);
    expect(ctx.fns.procs.db.select({ sql: 'SELECT idempotency_key FROM bot_outbox_messages' })).toEqual([{ idempotency_key: 'ordinary' }]);
    expect((await ctx.fns.procs.migrate.up({})).applied).toEqual(['003_broadcasts', '004_send_limits', ...newer]);
    expect(ctx.fns.bot.broadcasts()).toHaveLength(0);
});

test('audience uses full filter trees and text search without the user-list 200-row cap', async () => {
    const { ctx, connectionId, addUser } = await setup();
    for (let i = 0; i < 205; i++) addUser(String(i));
    addUser('bob', 'Bob');
    const draft = ctx.fns.bot.createBroadcast({ connectionId, text: 'Hi', q: 'Ada', tree: { any: [
        { filter: 'core.user.name', op: 'eq', value: 'Ada' }, { filter: 'core.user.name', op: 'eq', value: 'Bob' },
    ] } });
    expect(draft.recipients).toBe(205);
});

test('routes render the filter builder, preview escaped text, preserve invalid input and require confirmation and same origin', async () => {
    const { ctx, connectionId, addUser } = await setup();
    addUser('u');
    const dispatch = (opts: any) => ctx.fns.procs.http.dispatch(opts);
    const page = await dispatch({ url: '/bot/broadcasts' });
    const pageHtml = await page.text();
    expect(pageHtml).toContain('href="/bot/broadcasts/new"');
    expect(pageHtml).not.toContain('data-subject="users"');
    expect(pageHtml).not.toContain('Create draft');
    const newPage = await dispatch({ url: '/bot/broadcasts/new' });
    const newHtml = await newPage.text();
    expect(newHtml).toContain('data-subject="users"');
    expect(newHtml).toContain('Create draft');
    expect(newHtml).not.toContain('Recent broadcasts');
    const form = new URLSearchParams({ connection_id: String(connectionId), text: '<img src=x>', filters: '{"all":[]}', q: '' });
    const created = await dispatch({ method: 'POST', url: '/bot/broadcasts/new', body: form });
    expect(created.status).toBe(303);
    const location = created.headers.get('location')!;
    expect(location).toStartWith('/bot/broadcasts/new?preview=');
    const preview = await dispatch({ url: location });
    const html = await preview.text();
    expect(html).toContain('Start broadcast (1 recipients)');
    expect(html).toContain('Status: <strong>Draft</strong>');
    expect(html).toContain('Nothing will be sent until you start this broadcast.');
    expect(ctx.fns.bot.broadcasts()[0].status).toBe('draft');
    expect(ctx.fns.bot.pending({})).toHaveLength(0);
    expect(html).toContain('&lt;img src=x&gt;');
    const previewMain = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
    expect(previewMain).not.toContain('name="text"'); // The shell still has the agent's text composer.
    expect(html).not.toContain('Recent broadcasts');
    const id = ctx.fns.bot.broadcasts()[0].id;
    const list = await dispatch({ url: '/bot/broadcasts' });
    const listHtml = await list.text();
    expect(listHtml).toContain(`/bot/broadcasts/new?preview=${id}`);
    expect(listHtml).not.toContain('Start broadcast');
    expect(listHtml).not.toContain('&lt;img src=x&gt;');
    const oldLink = await dispatch({ url: `/bot/broadcasts?preview=${id}` });
    expect(oldLink.status).toBe(303);
    expect(oldLink.headers.get('location')).toBe(location);
    expect((await dispatch({ url: '/bot/broadcasts/new?preview=999999' })).status).toBe(404);
    const url = `/bot/broadcasts/${id}/start`;
    expect((await dispatch({ method: 'POST', url, body: new URLSearchParams() })).status).toBe(400);
    expect((await dispatch({ method: 'POST', url, headers: { origin: 'https://evil.example' }, body: new URLSearchParams({ confirm: 'yes' }) })).status).toBe(403);
    expect(ctx.fns.bot.pending({})).toHaveLength(0);
    const started = await dispatch({ method: 'POST', url, headers: { host: 'bot.example', origin: 'https://bot.example' }, body: new URLSearchParams({ confirm: 'yes' }) });
    expect(started.status).toBe(303);
    expect(started.headers.get('location')).toBe(location);
    const bad = await dispatch({ method: 'POST', url: '/bot/broadcasts/new', body: new URLSearchParams({ connection_id: String(connectionId), text: 'Retain my text', filters: 'not json' }) });
    expect(bad.status).toBe(400);
    expect(await bad.text()).toContain('Retain my text');
});
