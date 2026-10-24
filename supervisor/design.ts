// Astryx for the supervisor's own pages (sign in, change password).
//
// Those pages cannot use procs.ui: they are served while the runtime may be
// down, and the supervisor never loads application code. So the look is taken
// from the same source files the runtime compiles — the Astryx tokens and the
// rules of the few components the pages use, plus the Golos @font-face — and
// read once at start. Nothing is copied: a change to the core design shows up
// here on the next start. If the sources cannot be read the pages still work,
// just plainly styled.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const core = resolve(import.meta.dir, "..");
const CORE_CSS = resolve(core, "src/procs/ui/$style_core.css");
const APP_CSS = resolve(core, "src/procs/styles/$style_app.css");
export const FONT_SUBSETS = ["cyrillic", "latin", "latin-ext"];
export const fontFile = (name: string) => resolve(core, `assets/fonts/golos-text-${name}.woff2`);

// The components the pages render, by class prefix.
const COMPONENTS = [".asx-button", ".asx-input", ".asx-field", ".asx-card", ".asx-banner", ".asx-text", ".asx-link"];

// Top-level blocks of a stylesheet: `prelude { body }`, comments dropped,
// nested braces kept inside the body. Enough for these hand-written sheets.
export function blocks(css: string): Array<{ prelude: string; body: string }> {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const out: Array<{ prelude: string; body: string }> = [];
    let depth = 0, start = 0, open = 0;
    for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === "{") { if (depth++ === 0) open = i; }
        else if (c === "}" && depth > 0 && --depth === 0) {
            out.push({ prelude: src.slice(start, open).trim(), body: src.slice(open + 1, i).trim() });
            start = i + 1;
        } else if (c === ";" && depth === 0) start = i + 1;   // @import …; and the like
    }
    return out;
}

export function designCss(): string {
    try {
        const parts: string[] = [];
        for (const { prelude, body } of blocks(readFileSync(APP_CSS, "utf8"))) {
            if (prelude === "@font-face" && body.includes("Golos")) parts.push(`@font-face{${body.replaceAll("/procs/styles/font/", "/_auth/font/")}}`);
            else if (prelude === ":root" && body.includes("--font-sans")) parts.push(`:root{${body}}`);
        }
        for (const { prelude, body } of blocks(readFileSync(CORE_CSS, "utf8"))) {
            if (prelude.startsWith(":root")) parts.push(`${prelude}{${body}}`);
            else if (!prelude.startsWith("@") && prelude.split(",").every(s => COMPONENTS.some(p => s.trim().startsWith(p)))) parts.push(`${prelude}{${body}}`);
        }
        return parts.join("\n");
    } catch {
        return "";
    }
}
