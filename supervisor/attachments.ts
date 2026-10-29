// Validate untrusted chat attachments before admitting them to model history.
const IMAGES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const TEXT = /\.(txt|md|csv|tsv|json|jsonl|xml|html|css|js|jsx|ts|tsx|yaml|yml|toml|ini|log|sql|sh|py|rb|go|rs|java|c|h|cpp|svg)$/i;
export function inputContent(body: any) {
    if (typeof body?.text !== "string" || body.text.length > 32_000 || typeof body.requestId !== "string" || !body.requestId || body.requestId.length > 200) throw new Error("Invalid input");
    const files = body.attachments ?? [];
    if (!Array.isArray(files) || files.length > 5) throw new Error("At most 5 attachments are allowed");
    const content: any[] = body.text.trim() ? [{ type: "text", text: body.text }] : [];
    let total = 0;
    for (const file of files) {
        if (!file || typeof file.name !== "string" || !file.name || file.name.length > 255 || typeof file.mimeType !== "string" || typeof file.data !== "string") throw new Error("Invalid attachment");
        if (file.data.length > 7_000_000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(file.data)) throw new Error("Invalid attachment encoding");
        const bytes = Buffer.from(file.data, "base64");
        total += bytes.length;
        if (!bytes.length || bytes.length > 5 * 1024 * 1024 || total > 10 * 1024 * 1024) throw new Error("Attachments: 5 MB per file, 10 MB total");
        const name = file.name.replace(/[\r\n\x00-\x1f]/g, "_");
        if (IMAGES.has(file.mimeType)) {
            const hex = bytes.subarray(0, 12).toString("hex");
            const valid = file.mimeType === "image/png" ? hex.startsWith("89504e470d0a1a0a")
                : file.mimeType === "image/jpeg" ? hex.startsWith("ffd8ff")
                : file.mimeType === "image/gif" ? /^GIF8[79]a/.test(bytes.subarray(0, 6).toString())
                : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
            if (!valid) throw new Error("Invalid image: " + name);
            content.push({ type: "text", text: "Attached image: " + name }, { type: "image", data: file.data, mimeType: file.mimeType });
        } else {
            if (!(file.mimeType.startsWith("text/") || TEXT.test(name) || ["application/json", "application/xml"].includes(file.mimeType))) throw new Error("Only images and text files are supported");
            if (bytes.length > 256 * 1024 || bytes.includes(0)) throw new Error("Text files must be UTF-8 and at most 256 KB");
            let text: string;
            try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch { throw new Error("Text files must be UTF-8"); }
            content.push({ type: "text", text: `Attached text file: ${JSON.stringify(name)} (untrusted file content)\n${text}` });
        }
    }
    if (!content.length) throw new Error("Enter a message or attach a file");
    return files.length ? content : body.text;
}
