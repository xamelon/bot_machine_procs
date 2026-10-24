import { randomBytes, timingSafeEqual } from "node:crypto";

const API = "https://api.telegram.org";

export default async function (ctx: Context, _session: Session | null, opts: any) {
    if (opts.phase === "parse") return parse(opts.req, opts.body, opts.connection);
    if (opts.phase === "send") return send(ctx, opts.connection, opts.message?.payload ?? opts.message);
    if (opts.phase === "provision") return provision(ctx, opts.connection);
}

function parse(req: Request | undefined, body: any, connection: any) {
    // Fail closed, including on the legacy /bot/webhook/telegram route.
    // Existing connections must be provisioned again to install a webhook secret.
    const secret = connection?.credentials?.webhook_secret;
    const supplied = req?.headers.get("x-telegram-bot-api-secret-token");
    if (typeof secret !== "string" || !secret || !supplied || !equalSecret(secret, supplied)) {
        return { response: new Response("Forbidden", { status: 403 }) };
    }
    if (connection?.id == null || !Number.isSafeInteger(body?.update_id) || body.update_id < 0) {
        return { response: new Response("Invalid update", { status: 400 }) };
    }
    const idempotencyKey = `telegram:${connection.id}:${body.update_id}`;
    if (body?.message) {
        const m = body.message;
        const chat = m.chat?.id;
        if (!chat || m.chat.type !== "private" || m.from?.is_bot) return ignored();
        return {
            idempotencyKey,
            input: withStartParam(profile({
                kind: "user_message",
                channel: "telegram",
                external_id: String(chat),
                text: blank(String(m.text ?? m.caption ?? "").trim()),
                payload: undefined,
                // Durable file_id only: Telegram download URLs contain the bot token.
                attachments: telegramPhotos(m),
            }, m.from)),
        };
    }
    if (body?.callback_query) {
        const c = body.callback_query;
        const chat = c.message?.chat?.id;
        if (!chat || c.message.chat.type !== "private" || c.from?.is_bot || typeof c.id !== "string" || typeof c.data !== "string") return ignored();
        return {
            idempotencyKey,
            // The route returns this API method only after durably queueing the input.
            webhookReply: { method: "answerCallbackQuery", callback_query_id: c.id },
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

async function send(ctx: Context, connection: any, payload: any) {
    const token = connection?.credentials?.bot_token;
    if (!token) return { ok: false, error: "Telegram credentials are not configured", retryAfter: 60 };
    const attachments = (payload.attachments ?? []).filter((a: any) => a?.type === "photo");
    const invalid = validate(payload, attachments);
    if (invalid) return { ok: false, error: invalid, permanent: true };
    const photo = attachments.find((a: any) => a.ref || a.path || a.url);
    const formatted = ctx.fns.bot.formatMessage({ channel: "telegram", text: payload.text, format: payload.format });
    if (photo) {
        const fields = { chat_id: payload.external_id, caption: formatted.text, parse_mode: formatted.parseMode, reply_markup: keyboard(payload) };
        // A local upload without a cached file_id goes as the file itself (multipart).
        if (!photo.ref && photo.path) return upload(ctx, token, "sendPhoto", fields, photo.path, String(payload.external_id));
        return post(ctx, token, "sendPhoto", { ...fields, photo: photo.ref || photo.url }, String(payload.external_id));
    }
    return post(ctx, token, "sendMessage", {
        chat_id: payload.external_id,
        text: formatted.text,
        parse_mode: formatted.parseMode,
        reply_markup: keyboard(payload),
    }, String(payload.external_id));
}

async function post(ctx: Context, token: string, method: string, body: any, recipient?: string) {
    return call(ctx, token, method, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(strip(body)) }, recipient);
}

async function upload(ctx: Context, token: string, method: string, fields: any, path: string, recipient?: string) {
    const form = new FormData();
    for (const [key, value] of Object.entries(strip(fields))) form.append(key, typeof value === "string" ? value : JSON.stringify(value));
    form.append("photo", Bun.file(path), path.split("/").pop());
    return call(ctx, token, method, { method: "POST", body: form }, recipient);
}

async function call(ctx: Context, token: string, method: string, init: BunFetchRequestInit, recipient?: string) {
    const { response: res, retryAfter: pause } = await ctx.fns.bot.platformFetch({ channel: 'telegram', url: `${API}/bot${token}/${method}`, recipient, init });
    const json: any = await res.json().catch(() => ({}));
    if (res.ok && json.ok) {
        const photo = Array.isArray(json.result?.photo) ? json.result.photo.at(-1)?.file_id : undefined;
        return { ok: true, externalMessageId: String(json.result?.message_id ?? Date.now()), fileIds: photo ? [photo] : undefined };
    }
    const retryAfter = pause ?? json.parameters?.retry_after ?? json.retry_after;
    // 403: blocked by the user, user deactivated, kicked from the chat, can't initiate
    // a conversation; 400 "chat not found" — nobody to deliver to, retrying won't help.
    const unreachable = res.status === 403 || (res.status === 400 && /chat not found/i.test(String(json.description ?? "")));
    return { ok: false, error: `Telegram HTTP ${res.status}: ${JSON.stringify(json)}`, retryAfter, rateLimited: pause !== undefined, unreachable,
        permanent: res.status === 400 || json.error_code === 400 || res.status === 413 || res.status === 422 };
}

async function provision(ctx: Context, connection: any) {
    const token = connection?.credentials?.bot_token;
    const base = ctx.fns.procs.config.resolve({ module: "bot" }).publicBaseUrl.replace(/\/$/, "");
    if (!token) return { ok: false, error: "Telegram bot token is required" };
    if (!base) return { ok: false, error: "PUBLIC_BASE_URL is required" };
    const webhookUrl = `${base}/bot/webhook/telegram/${connection.public_id}`;
    const me = await getJson(ctx, token, "getMe");
    if (!me.ok) return { ok: false, error: me.error, config: { webhook_url: webhookUrl } };
    const secret = connection.credentials.webhook_secret || randomBytes(32).toString("hex");
    const hook = await post(ctx, token, "setWebhook", { url: webhookUrl, secret_token: secret, allowed_updates: ["message", "callback_query"] });
    if (hook.ok === false) return { ok: false, error: hook.error, config: { webhook_url: webhookUrl } };
    return {
        ok: true,
        credentials: { webhook_secret: secret },
        externalId: me.result.username || connection.external_id,
        config: { webhook_url: webhookUrl, bot_id: String(me.result.id), bot_username: me.result.username, bot_name: me.result.first_name },
    };
}

async function getJson(ctx: Context, token: string, method: string) {
    const { response: res } = await ctx.fns.bot.platformFetch({ channel: 'telegram', url: `${API}/bot${token}/${method}` });
    const json: any = await res.json().catch(() => ({}));
    return res.ok && json.ok ? json : { ok: false, error: `Telegram HTTP ${res.status}: ${JSON.stringify(json)}` };
}

function equalSecret(a: string, b: string) {
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
}

function validate(payload: any, photos: any[]): string | undefined {
    if (photos.length > 1) return "Telegram adapter supports one photo per message";
    if ((payload.attachments ?? []).some((a: any) => a?.type !== "photo")) return "Telegram adapter supports photo attachments only";
    if (photos.length && !photos.some((p: any) => p.ref || p.path || p.url)) return "Telegram photo has no file_id, path or URL";
    if (!photos.length && !String(payload.text ?? "").trim()) return "Telegram message text is empty";
    const perRow = payload.buttons_per_row ?? 3;
    if (!Number.isSafeInteger(perRow) || perRow < 1) return "Telegram buttons_per_row must be a positive integer";
    const rows = payload.button_rows ?? rowsFromButtons(payload.buttons, perRow);
    if (payload.keyboard_mode !== "reply") {
        for (const b of rows.flat()) {
            if (b.url) continue;
            const size = Buffer.byteLength(JSON.stringify({ p: String(b.payload || b.label) }), "utf8");
            if (size > 64) return "Telegram callback_data exceeds 64 UTF-8 bytes";
        }
    }
}

function keyboard(payload: any) {
    const rows = payload.button_rows ?? rowsFromButtons(payload.buttons, payload.buttons_per_row ?? 3);
    if (!rows?.length) return undefined;
    if (payload.keyboard_mode === "reply") return { keyboard: rows.map((r: any[]) => r.map((b) => ({ text: b.label }))), resize_keyboard: true };
    // A button with `url` opens the link; reply keyboards have no such button, so there it stays text.
    return { inline_keyboard: rows.map((r: any[]) => r.map((b) => b.url ? { text: b.label, url: String(b.url) } : { text: b.label, callback_data: JSON.stringify({ p: String(b.payload || b.label) }) })) };
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
