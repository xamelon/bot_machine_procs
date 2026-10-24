// The supervisor's own pages: sign in and change password. They work while the
// runtime is down, so they cannot call procs.ui — but they use its markup (the
// HTML `ui.card`, `ui.field`, `ui.input`, `ui.button`, `ui.banner`, `ui.link`
// produce) and its stylesheet rules, read from the core by design.ts.
import { designCss } from "./design";

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Only the page layout is ours; colours, type and components are Astryx's.
// The fallbacks keep the page legible if the design could not be read.
const LAYOUT = `*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:var(--asx-space-4,16px);background:var(--color-asx-background-body,#fafaf9);color:var(--color-asx-text-primary,#1c1917);font-family:var(--font-sans,system-ui,sans-serif);font-size:var(--asx-text-body-size,14px);line-height:var(--asx-text-body-leading,20px)}
.auth{width:min(380px,100%);--asx-card-padding:var(--asx-space-6,24px)}
.auth h1{margin:0;font-size:20px;line-height:28px;font-weight:var(--asx-font-weight-semibold,600)}
.auth__lead{display:block;margin:var(--asx-space-1,4px) 0 var(--asx-space-5,20px)}
.auth form{display:grid;gap:var(--asx-space-4,16px)}
.auth .asx-banner{margin-bottom:var(--asx-space-4,16px)}
.auth .asx-field__control-stack,.auth .asx-input{width:100%}
.auth .asx-button{width:100%}
.auth__foot{margin-top:var(--asx-space-4,16px);text-align:center}`;

let style: string | null = null;
function page(title: string, body: string, status = 200, headers: Record<string, string> = {}) {
    style ??= `${designCss()}\n${LAYOUT}`;
    return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><style>${style}</style></head><body><section class="asx-card auth" data-variant="default" data-elevation="low">${body}</section></body></html>`, {
        status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", ...headers },
    });
}

const banner = (tone: "error" | "success", title: string) => `<section class="asx-banner" data-tone="${tone}" role="${tone === "error" ? "alert" : "status"}"><div><div class="asx-banner__title">${esc(title)}</div></div></section>`;
// ui.field around ui.input. `attrs` is trusted markup written below.
const field = (label: string, id: string, attrs: string) => `<div class="asx-field"><span class="asx-field__label-group"><label class="asx-field__label" for="${id}">${esc(label)}</label></span><span class="asx-field__control-stack"><input class="asx-input" data-size="md" id="${id}" name="${id}" ${attrs}></span></div>`;
const submit = (label: string) => `<button class="asx-button" data-variant="primary" data-size="lg" type="submit"><span class="asx-button__label">${esc(label)}</span></button>`;
const link = (href: string, label: string) => `<a class="asx-link" href="${esc(href)}">${esc(label)}</a>`;
const head = (title: string, lead: string) => `<h1>${esc(title)}</h1><span class="asx-text auth__lead" data-tone="secondary" data-size="body" data-weight="regular">${esc(lead)}</span>`;

export function loginPage(opts: { next: string; error?: string; login?: string; status?: number }) {
    return page("Sign in", `${head("Sign in", "Bot admin")}${opts.error ? banner("error", opts.error) : ""}
<form method="post" action="/_auth/login"><input type="hidden" name="next" value="${esc(opts.next)}">
${field("Login", "login", `autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus value="${esc(opts.login ?? "")}"`)}
${field("Password", "password", `type="password" autocomplete="current-password" required`)}
${submit("Sign in")}</form>`, opts.status);
}

export function passwordPage(opts: { login: string; error?: string; done?: boolean; status?: number; headers?: Record<string, string> }) {
    const form = `<form method="post" action="/_auth/password"><input type="hidden" name="login" value="${esc(opts.login)}" autocomplete="username">
${field("Current password", "current", `type="password" autocomplete="current-password" required autofocus`)}
${field("New password", "password", `type="password" autocomplete="new-password" minlength="8" required`)}
${field("Repeat new password", "repeat", `type="password" autocomplete="new-password" minlength="8" required`)}
${submit("Change password")}</form>`;
    return page("Change password", `${head("Change password", `Signed in as ${opts.login}. Other sessions will be signed out.`)}${opts.error ? banner("error", opts.error) : ""}${opts.done ? banner("success", "Password changed. Other sessions were signed out.") : form}<div class="auth__foot">${link("/", "Back to admin")}</div>`, opts.status, opts.headers);
}

// Only a same-site path may follow a login; anything else goes home.
export function safeNext(value: unknown): string {
    const next = typeof value === "string" ? value : "";
    return /^\/(?![/\\])/.test(next) && !next.startsWith("/_auth/") ? next : "/";
}
