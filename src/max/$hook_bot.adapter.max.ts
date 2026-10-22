// MAX uses the Russian Trusted CA chain. Extend trust for this adapter's
// requests only; retain standard roots and full certificate/hostname checks.
import { rootCertificates } from "node:tls";

const API = "https://platform-api2.max.ru";

async function maxTls() {
    const russianCa = await Bun.file(new URL("../../assets/certs/russian-trusted-ca.pem", import.meta.url)).text();
    return { ca: [...rootCertificates, russianCa], rejectUnauthorized: true };
}

export default async function (ctx: Context, _session: Session | null, opts: any) {
    if (opts.phase === "parse") return parse(opts.req, opts.body, opts.connection);
    if (opts.phase === "send") return send(ctx, opts.connection, opts.message?.payload ?? opts.message);
    if (opts.phase === "provision") return provision(ctx, opts.connection);
}

function parse(req: Request | undefined, body: any, connection: any) {
    const secret = connection?.credentials?.webhook_secret;
    if (secret && req?.headers.get("x-max-bot-api-secret") !== secret) return { response: new Response("Forbidden", { status: 403 }) };

    if (body?.update_type === "message_created") {
        const message = body.message ?? {};
        const sender = message.sender ?? body.user ?? {};
        const recipient = message.recipient ?? {};
        const msgBody = message.body ?? message.message_body ?? {};
        const chat = body.chat_id ?? recipient.chat_id;
        if (!chat) return ignored();
        return {
            idempotencyKey: `max:${body.timestamp ?? ""}:${msgBody.mid ?? msgBody.message_id ?? JSON.stringify(body).length}`,
            input: withStartParam(profile({
                kind: "user_message",
                channel: "max",
                external_id: String(chat),
                text: blank(String(msgBody.text ?? "").trim()),
                attachments: msgBody.attachments ?? [],
            }, sender)),
        };
    }

    if (body?.update_type === "message_callback") {
        const callback = body.callback ?? {};
        const message = body.message ?? {};
        const sender = callback.user ?? body.user ?? message.sender ?? {};
        const recipient = message.recipient ?? {};
        const chat = body.chat_id ?? recipient.chat_id;
        if (!chat) return ignored();
        return {
            idempotencyKey: `max:${body.timestamp ?? ""}:${callback.callback_id ?? JSON.stringify(body).length}`,
            input: profile({
                kind: "user_message",
                channel: "max",
                external_id: String(chat),
                text: callback.payload ?? "",
                payload: callback.payload,
                attachments: [],
            }, sender),
        };
    }

    if (body?.update_type === "bot_started") {
        const chat = body.chat_id;
        if (!chat) return ignored();
        return {
            idempotencyKey: `max:${body.timestamp ?? ""}:started:${chat}`,
            input: withStartParam(profile({
                kind: "user_message",
                channel: "max",
                external_id: String(chat),
                text: body.payload ? `/start ${body.payload}` : "/start",
                start_param: body.payload,
                attachments: [],
            }, body.user)),
        };
    }

    return ignored();
}

async function send(ctx: Context, connection: any, payload: any) {
    const token = connection?.credentials?.access_token;
    if (!token) return { ok: false, error: "MAX access token is not configured", retryAfter: 60 };
    const { response: res, retryAfter: pause } = await ctx.fns.bot.platformFetch({ channel: 'max', url: `${API}/messages?chat_id=${encodeURIComponent(payload.external_id)}`, recipient: String(payload.external_id), init: {
        method: "POST",
        tls: await maxTls(),
        headers: { Authorization: token, "content-type": "application/json" },
        body: JSON.stringify(strip({
            text: payload.text || "",
            attachments: keyboard(payload),
            format: payload.format,
            notify: payload.notify,
        })),
    } });
    const json: any = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, externalMessageId: String(json.message?.body?.mid ?? json.message?.body?.message_id ?? Date.now()) };
    return { ok: false, error: `MAX HTTP ${res.status}: ${JSON.stringify(json)}`, retryAfter: pause ?? 60, rateLimited: pause !== undefined };
}

async function provision(ctx: Context, connection: any) {
    const creds = connection?.credentials ?? {};
    const token = creds.access_token;
    const base = ctx.fns.procs.config.resolve({ module: "bot" }).publicBaseUrl.replace(/\/$/, "");
    if (!token) return { ok: false, error: "MAX access token is required" };
    if (!base) return { ok: false, error: "PUBLIC_BASE_URL is required" };
    const url = `${base}/bot/webhook/max/${connection.public_id}`;
    const secret = creds.webhook_secret || `max_${connection.public_id}`;
    const sub = await api(ctx, token, "/subscriptions", {
        url,
        secret,
        update_types: ["bot_started", "bot_stopped", "message_created", "message_callback"],
    });
    if (sub.ok === false) return { ok: false, error: sub.error, credentials: { webhook_secret: secret }, config: { webhook_url: url } };
    const me = await api(ctx, token, "/me");
    return {
        ok: true,
        externalId: me.ok === false ? connection.external_id : me.username || me.user_id || connection.external_id,
        credentials: { webhook_secret: secret },
        config: { webhook_url: url, bot_username: me.username, bot_name: me.first_name ?? me.name },
    };
}

async function api(ctx: Context, token: string, path: string, body?: any) {
    const { response: res } = await ctx.fns.bot.platformFetch({ channel: 'max', url: `${API}${path}`, init: {
        method: body ? "POST" : "GET",
        tls: await maxTls(),
        headers: { Authorization: token, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    } });
    const json: any = await res.json().catch(() => ({}));
    return res.ok ? json : { ok: false, error: `MAX HTTP ${res.status}: ${JSON.stringify(json)}` };
}

function keyboard(payload: any) {
    const rows = payload.button_rows ?? rowsFromButtons(payload.buttons, payload.buttons_per_row ?? 3);
    if (!rows?.length) return payload.attachments;
    return [{
        type: "inline_keyboard",
        payload: { buttons: rows.map((r: any[]) => r.map((b) => b.url ? { type: "link", text: b.label, url: b.url } : { type: "callback", text: b.label, payload: String(b.payload || b.label) })) },
    }];
}
function rowsFromButtons(buttons: any[] = [], perRow = 3) { const out = []; for (let i = 0; i < buttons.length; i += perRow) out.push(buttons.slice(i, i + perRow)); return out; }
function profile(input: any, from: any) {
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ") || from?.name;
    const metadata: any = {};
    if (from?.user_id) metadata.max_user_id = String(from.user_id);
    if (from?.username) metadata.username = from.username;
    if (name) input.display_name = name;
    if (Object.keys(metadata).length) input.metadata = metadata;
    return input;
}
function withStartParam(input: any) {
    const parts = String(input.text ?? "").trim().split(/\s+/, 2);
    if ((parts[0] ?? "").replace(/^\//, "").toLowerCase() === "start" && parts[1]) input.start_param = parts[1];
    return input;
}
function ignored() { return { status: 200, body: JSON.stringify({ ok: true, ignored: true }) }; }
function strip(obj: any) { return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)); }
function blank(value: string) { return value === "" ? undefined : value; }
