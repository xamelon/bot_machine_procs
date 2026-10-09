import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";

const MAX = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif" };

// Store an editor upload where delivery can find it. The public path is the cache key.
export default async function (ctx: Context, _session: Session | null, opts: { file: File }) {
    const bytes = new Uint8Array(await opts.file.arrayBuffer());
    if (bytes.byteLength < 1 || bytes.byteLength > MAX) throw new Error("image must be between 1 byte and 5 MB");
    const ext = TYPES[(opts.file.type || mime(opts.file.name)).toLowerCase()];
    if (!ext) throw new Error("only JPEG, PNG, WebP and GIF images are allowed");
    const filename = `media_${randomBytes(6).toString("base64url")}${ext}`;
    const dir = `${ctx.fns.procs.project.runtimeDir({})}/uploads/bot`;
    mkdirSync(dir, { recursive: true });
    await Bun.write(`${dir}/${filename}`, bytes);
    return { url: `/uploads/bot/${filename}`, filename };
}

function mime(name: string) {
    const ext = name.toLowerCase().split(".").pop();
    return ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
}
