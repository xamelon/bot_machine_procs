const API = "https://api.telegram.org";

export default async function (ctx: Context, _session: Session | null, opts: any) {
    if (opts.phase === "parse") return parse(opts.body, opts.connection);
    if (opts.phase === "send") return send(opts.connection, opts.message?.payload ?? opts.message);
    if (opts.phase === "provision") return provision(ctx, opts.connection);
}

async function parse(body: any, connection: any) {
    if (body?.message) {
        const m = body.message;
        const chat = m.chat?.id;
        if (!chat) return ignored();
        return {
            idempotencyKey: `telegram:${body.update_id}`,
            input: withStartParam(profile({
                kind: "user_message",
                channel: "telegram",
                external_id: String(chat),
                text: blank(String(m.text ?? m.caption ?? "").trim()),
                payload: undefined,
                attachments: await withFileUrls(connection, telegramPhotos(m)),
            }, m.from)),
        };
    }
    if (body?.callback_query) {
        const c = body.callback_query;
        const chat = c.message?.chat?.id;
        if (!chat) return ignored();
        return {
            idempotencyKey: `telegram:${body.update_id}`,
            input: profile({
                kind: "user_message",
                channel: "telegram",
                external_id: String(chat),
                text: c.data ?? "",
                payload: parsePayload(c.data),
                attachments: [],
            }, c.from),
        };
    }
    return ignored();
}

function ignored() { return { status: 200, body: JSON.stringify({ ok: true, ignored: true }) }; }

async function send(connection: any, payload: any) {
    const token = connection?.credentials?.bot_token;
    if (!token) return { ok: false, error: "Telegram credentials are not configured", retryAfter: 60 };
    const attachments = (payload.attachments ?? []).filter((a: any) => a?.type === "photo");
    const photo = attachments.find((a: any) => a.ref || a.url);
    if (photo) {
        return post(token, "sendPhoto", {
            chat_id: payload.external_id,
            photo: photo.ref || photo.url,
            caption: payload.text || "",
            reply_markup: keyboard(payload),
        });
    }
    return post(token, "sendMessage", {
        chat_id: payload.external_id,
        text: payload.text || "",
        reply_markup: keyboard(payload),
    });
}

async function post(token: string, method: string, body: any) {
    const res = await fetch(`${API}/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(strip(body)),
    });
    const json: any = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
        const photo = Array.isArray(json.result?.photo) ? json.result.photo.at(-1)?.file_id : undefined;
        return { ok: true, externalMessageId: String(json.result?.message_id ?? Date.now()), fileIds: photo ? [photo] : undefined };
    }
    const retryAfter = json.parameters?.retry_after ?? json.retry_after;
    return { ok: false, error: `Telegram HTTP ${res.status}: ${JSON.stringify(json)}`, retryAfter };
}

async function provision(ctx: Context, connection: any) {
    const token = connection?.credentials?.bot_token;
    const base = ctx.fns.procs.config.resolve({ module: "bot" }).publicBaseUrl.replace(/\/$/, "");
    if (!token) return { ok: false, error: "Telegram bot token is required" };
    if (!base) return { ok: false, error: "PUBLIC_BASE_URL is required" };
    const webhookUrl = `${base}/bot/webhook/telegram/${connection.public_id}`;
    const me = await getJson(token, "getMe");
    if (!me.ok) return { ok: false, error: me.error, config: { webhook_url: webhookUrl } };
    const hook = await post(token, "setWebhook", { url: webhookUrl, allowed_updates: ["message", "callback_query"] });
    if (hook.ok === false) return { ok: false, error: hook.error, config: { webhook_url: webhookUrl } };
    return {
        ok: true,
        externalId: me.result.username || connection.external_id,
        config: { webhook_url: webhookUrl, bot_id: String(me.result.id), bot_username: me.result.username, bot_name: me.result.first_name },
    };
}

async function getJson(token: string, method: string) {
    const res = await fetch(`${API}/bot${token}/${method}`);
    const json: any = await res.json().catch(() => ({}));
    return res.ok && json.ok ? json : { ok: false, error: `Telegram HTTP ${res.status}: ${JSON.stringify(json)}` };
}

async function withFileUrls(connection: any, attachments: any[]) {
    const token = connection?.credentials?.bot_token;
    if (!token) return attachments;
    for (const attachment of attachments) {
        if (!attachment.ref || attachment.url) continue;
        const file = await getJson(token, `getFile?file_id=${encodeURIComponent(attachment.ref)}`);
        if (file.ok && file.result?.file_path) attachment.url = `${API}/file/bot${token}/${file.result.file_path}`;
    }
    return attachments;
}

function keyboard(payload: any) {
    const rows = payload.button_rows ?? rowsFromButtons(payload.buttons, payload.buttons_per_row ?? 3);
    if (!rows?.length) return undefined;
    if (payload.keyboard_mode === "reply") return { keyboard: rows.map((r: any[]) => r.map((b) => ({ text: b.label }))), resize_keyboard: true };
    return { inline_keyboard: rows.map((r: any[]) => r.map((b) => ({ text: b.label, callback_data: JSON.stringify({ p: String(b.payload || b.label) }) }))) };
}
function rowsFromButtons(buttons: any[] = [], perRow = 3) {
    const out: any[] = [];
    for (let i = 0; i < buttons.length; i += perRow) out.push(buttons.slice(i, i + perRow));
    return out;
}
function telegramPhotos(m: any) {
    const best = Array.isArray(m.photo) ? [...m.photo].sort((a, b) => (b.file_size ?? 0) - (a.file_size ?? 0))[0] : null;
    return best?.file_id ? [{ type: "photo", ref: best.file_id }] : [];
}
function parsePayload(raw: any) { try { const j = JSON.parse(raw); return j?.p ?? raw; } catch { return raw; } }
function profile(input: any, from: any) {
    const name = [from?.first_name, from?.last_name].filter(Boolean).join(" ");
    const metadata: any = {};
    if (from?.id) metadata.telegram_user_id = String(from.id);
    if (from?.username) metadata.username = from.username;
    if (from?.language_code) metadata.language_code = from.language_code;
    if (name) input.display_name = name;
    if (Object.keys(metadata).length) input.metadata = metadata;
    return input;
}
function withStartParam(input: any) {
    const parts = String(input.text ?? "").trim().split(/\s+/, 2);
    if ((parts[0] ?? "").replace(/^\//, "").toLowerCase() === "start" && parts[1]) input.start_param = parts[1];
    return input;
}
function strip(obj: any) { return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== "" && v !== null)); }
function blank(value: string) { return value === "" ? undefined : value; }
