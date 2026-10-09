import { createHash } from "node:crypto";

const API_VERSION = "5.199";

export default async function (ctx: Context, _session: Session | null, opts: any) {
    if (opts.phase === "parse") return parse(ctx, opts.body, opts.connection);
    if (opts.phase === "send") return send(opts.connection, opts.message?.payload ?? opts.message);
    if (opts.phase === "provision") return provision(ctx, opts.connection, opts.waitMs ?? 15_000);
}

function parse(ctx: Context, body: any, connection: any) {
    const creds = connection?.credentials ?? {};
    if (creds.callback_secret && body?.secret && body.secret !== creds.callback_secret) return { status: 200, body: "ok" };
    if (body?.type === "confirmation") {
        markConfirmed(ctx, connection);
        const code = creds.confirmation_code || "";
        return { response: new Response(code, { status: code ? 200 : 403, headers: { "content-type": "text/plain; charset=utf-8" } }) };
    }
    if (body?.type !== "message_new") return { status: 200, body: "ok" };
    const message = body.object?.message ?? body.object ?? {};
    const user = message.from_id ?? message.peer_id;
    if (!user) return { status: 200, body: "ok" };
    return {
        idempotencyKey: `vk:${body.group_id ?? ""}:${body.event_id ?? createHash("sha256").update(JSON.stringify(body)).digest("hex")}`,
        input: withStartParam(maybeRef({
            kind: "user_message",
            channel: "vk",
            external_id: String(user),
            text: blank(String(message.text ?? "").trim()),
            payload: parsePayload(message.payload),
            attachments: photos(message.attachments ?? []),
        }, message)),
    };
}

async function send(connection: any, payload: any) {
    const token = connection?.credentials?.group_access_token;
    if (!token) return { ok: false, error: "VK credentials are not configured", retryAfter: 60 };
    const refs: string[] = [];
    for (const attachment of (payload.attachments ?? []).slice(0, 10)) {
        const ref = await resolveAttachment(token, payload.external_id, attachment);
        if (ref?.ok === false) return ref;
        if (ref) refs.push(ref);
    }
    const form: Record<string, string> = {
        peer_id: String(payload.external_id),
        random_id: stableRandomId({ ...payload, _outbox_id: payload.id }),
        message: payload.text || "",
        v: API_VERSION,
    };
    const keyboard = vkKeyboard(payload.button_rows ?? payload.buttons ?? [], payload.keyboard_mode ?? "inline", payload.buttons_per_row ?? 3);
    if (keyboard) form.keyboard = keyboard;
    if (refs.length) form.attachment = refs.join(",");
    const json = await vk(token, "messages.send", form);
    if (json.ok === false) return json;
    if (typeof json.response === "number" || typeof json.response === "string") return { ok: true, externalMessageId: String(json.response) };
    return { ok: false, error: "VK send returned invalid response", retryAfter: 60 };
}

async function provision(ctx: Context, connection: any, waitMs: number) {
    const creds = connection?.credentials ?? {};
    const token = creds.group_access_token;
    const groupId = creds.group_id || connection?.external_id;
    const base = ctx.fns.procs.config.resolve({ module: "bot" }).publicBaseUrl.replace(/\/$/, "");
    if (!token) return { ok: false, error: "Group access token is required" };
    if (!groupId) return { ok: false, error: "Group ID is required" };
    if (!base) return { ok: false, error: "PUBLIC_BASE_URL is required" };
    const url = `${base}/bot/webhook/vk/${connection.public_id}`;
    const code = await vk(token, "groups.getCallbackConfirmationCode", { group_id: String(groupId), v: API_VERSION });
    if (code.ok === false) return code;
    const confirmation = code.response?.code;
    const secret = creds.callback_secret || createHash("sha256").update(`${connection.public_id}:${Date.now()}`).digest("hex").slice(0, 32);
    ctx.fns.procs.db.run({
        sql: "UPDATE bot_channel_connections SET credentials = ?, updated_at = ? WHERE id = ?",
        params: [JSON.stringify({ ...creds, confirmation_code: confirmation, callback_secret: secret, confirmation_received_at: null }), new Date().toISOString(), connection.id],
    });
    const listed = await vk(token, "groups.getCallbackServers", { group_id: String(groupId), v: API_VERSION });
    const found = (listed.response?.items ?? []).find((server: any) => server.url === url || String(server.id) === String(creds.callback_server_id));
    const server = found
        ? await vk(token, "groups.editCallbackServer", { group_id: String(groupId), server_id: String(found.id), url, title: "bot", secret_key: secret, v: API_VERSION })
        : await vk(token, "groups.addCallbackServer", { group_id: String(groupId), url, title: "bot", secret_key: secret, v: API_VERSION });
    if (server.ok === false) return { ok: false, error: server.error, credentials: { confirmation_code: confirmation, callback_secret: secret } };
    const serverId = found?.id ?? server.response?.server_id;
    const confirmed = await waitConfirmed(ctx, connection.id, waitMs);
    if (!confirmed) return { ok: false, error: "VK did not confirm callback URL", credentials: { confirmation_code: confirmation, callback_secret: secret, callback_server_id: String(serverId) } };
    const settings = await vk(token, "groups.setCallbackSettings", { group_id: String(groupId), server_id: String(serverId), message_new: "1", v: API_VERSION });
    if (settings.ok === false) return { ok: false, error: settings.error, credentials: { confirmation_code: confirmation, callback_secret: secret, callback_server_id: String(serverId) } };
    return { ok: true, externalId: String(groupId), credentials: { confirmation_code: confirmation, callback_secret: secret, callback_server_id: String(serverId) }, config: { webhook_url: url, provision_status: "active" } };
}

async function resolveAttachment(token: string, peerId: string, attachment: any) {
    if (attachment?.type !== "photo") return null;
    if (attachment.ref) return attachment.ref;
    if (!attachment.url) return null;
    const upload = await vk(token, "photos.getMessagesUploadServer", { peer_id: String(peerId), v: API_VERSION });
    if (upload.ok === false) return upload;
    const image = await fetch(attachment.url);
    if (!image.ok) return { ok: false, error: `image fetch failed with HTTP ${image.status}`, retryAfter: 60 };
    const type = image.headers.get("content-type") || "image/jpeg";
    const form = new FormData();
    form.append("photo", new Blob([await image.arrayBuffer()], { type }), type.includes("png") ? "photo.png" : "photo.jpg");
    const uploadedRes = await fetch(upload.response.upload_url, { method: "POST", body: form });
    const uploaded: any = await uploadedRes.json().catch(() => ({}));
    if (!uploadedRes.ok || !uploaded.hash) return { ok: false, error: "VK photo upload failed", retryAfter: 60 };
    const saved = await vk(token, "photos.saveMessagesPhoto", { server: String(uploaded.server), photo: uploaded.photo, hash: uploaded.hash, v: API_VERSION });
    if (saved.ok === false) return saved;
    const photo = saved.response?.[0];
    return photo ? `photo${photo.owner_id}_${photo.id}` : { ok: false, error: "VK save photo returned invalid response", retryAfter: 60 };
}

async function vk(token: string, method: string, params: Record<string, string>) {
    const res = await fetch(`https://api.vk.com/method/${method}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params),
    });
    const json: any = await res.json().catch(() => ({}));
    if (json.error?.error_code && [6, 9, 29, 129].includes(json.error.error_code)) return { ok: false, error: json.error.error_msg || "VK flood control", retryAfter: 2 };
    if (!res.ok || json.error) return { ok: false, error: json.error?.error_msg || `VK HTTP ${res.status}: ${JSON.stringify(json)}`, retryAfter: res.status === 429 ? 2 : 60 };
    return json;
}

function markConfirmed(ctx: Context, connection: any) {
    if (!connection?.id) return;
    const credentials = { ...(connection.credentials ?? {}), confirmation_received_at: new Date().toISOString() };
    ctx.fns.procs.db.run({ sql: "UPDATE bot_channel_connections SET credentials = ?, updated_at = ? WHERE id = ?", params: [JSON.stringify(credentials), credentials.confirmation_received_at, connection.id] });
}

async function waitConfirmed(ctx: Context, id: number, waitMs: number) {
    const until = Date.now() + waitMs;
    do {
        const row = ctx.fns.procs.db.select({ sql: "SELECT credentials FROM bot_channel_connections WHERE id = ?", params: [id] })[0];
        if (JSON.parse(row?.credentials || "{}").confirmation_received_at) return true;
        if (Date.now() >= until) return false;
        await Bun.sleep(50);
    } while (Date.now() <= until);
    return false;
}

function vkKeyboard(buttonRows: any, mode: string, perRow: number) {
    const flat = Array.isArray(buttonRows?.[0]) ? null : buttonRows;
    const rows = flat ? chunk(flat, Math.max(1, Math.min(Number(perRow) || 3, 5))) : buttonRows;
    if (!rows?.length) return undefined;
    return JSON.stringify({
        one_time: false,
        inline: mode !== "reply",
        buttons: rows.map((r: any[]) => r.map((b) => ({ action: { type: "text", label: b.label, payload: JSON.stringify({ p: String(b.payload || b.label) }) }, color: "primary" }))),
    });
}
function photos(items: any[]) {
    return items.flatMap((a) => {
        if (a?.type !== "photo" || !a.photo) return [];
        const ref = `photo${a.photo.owner_id}_${a.photo.id}`;
        const url = [...(a.photo.sizes ?? [])].sort((x, y) => ((y.width ?? 0) * (y.height ?? 0)) - ((x.width ?? 0) * (x.height ?? 0)))[0]?.url;
        return [{ type: "photo", ref, url }];
    });
}
function parsePayload(raw: any) { try { const j = JSON.parse(raw); return j?.p ?? j?.payload ?? undefined; } catch { return undefined; } }
function maybeRef(input: any, message: any) { if (!input.start_param && message.ref) input.start_param = String(message.ref); return input; }
function withStartParam(input: any) {
    const parts = String(input.text ?? "").trim().split(/\s+/, 2);
    if ((parts[0] ?? "").replace(/^\//, "").toLowerCase() === "start" && parts[1]) input.start_param = parts[1];
    return input;
}
function stableRandomId(payload: any) { return String(createHash("sha256").update(JSON.stringify(payload)).digest().readInt32BE(0) & 0x7fffffff); }
function chunk(xs: any[], n: number) { const out = []; for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n)); return out; }
function blank(value: string) { return value === "" ? undefined : value; }
