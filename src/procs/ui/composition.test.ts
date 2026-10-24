// Presentation stays inside components; screens compose them without a utility stylesheet.
import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { testCtx } from "../../$test";

const ctx = await testCtx();
const ui = ctx.fns.procs.ui;

test("error pages compose the kit and escape diagnostic text", () => {
    const crash = ui.crashed({ id: "incident", message: '<script>alert("oops")</script>' }).main;
    expect(crash).toContain('class="asx-collapsible');
    expect(crash).toContain('class="asx-code-block');
    expect(crash).toContain('&lt;script&gt;');
    expect(crash).not.toContain('<script>');
    expect(crash).not.toContain('undefined');
    const miss = ui.notFound({ url: '<missing>', back: { label: 'Home', href: '/' } }).main;
    expect(miss).toContain('data-action="back"');
    expect(miss).toContain('hx-get="/"');
    expect(miss).toContain('&lt;missing&gt;');
});

test("grid expresses pane-responsive columns without class strings", () => {
    const grid = ui.grid({ columns: { medium: 2, wide: 3 }, gap: 4, body: 'cells' });
    expect(grid).toContain('data-medium');
    expect(grid).toContain('data-wide');
    expect(grid).toContain('--asx-grid-columns:repeat(1, minmax(0, 1fr))');
    expect(grid).toContain('--asx-grid-medium:repeat(2, minmax(0, 1fr))');
    expect(grid).toContain('--asx-grid-wide:repeat(3, minmax(0, 1fr))');
    expect(ui.grid({ columns: 2, body: '' })).toContain('data-stack');
    expect(ui.grid({ body: '' })).not.toContain('data-medium');
});

test("form owns its layout while preserving native and htmx submissions", () => {
    expect(ui.form({ body: 'fields', post: '/save', form: 'settings' })).toContain('hx-post="/save" hx-target="#main"');
    const native = ui.form({ body: 'fields', action: '/_control/users' });
    expect(native).toContain('action="/_control/users" method="post"');
    expect(native).not.toContain('hx-post');
    expect(ctx.fns.bot.form({ body: 'fields' })).toContain('class="asx-form ');
});

test("the UI showcase renders using the actual component API", async () => {
    const res = await ctx.fns.procs.http.dispatch({ url: '/procs/ui', headers: { 'hx-request': 'true' } });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Astryx core kit');
});

test("shared source no longer contains Tailwind utility class names", async () => {
    const root = resolve(import.meta.dir, '../..');
    const utility = /^(?:(?:sm|md|lg|hover):)*(?:flex|grid|inline|inline-flex|inline-block|grow|shrink-0|truncate|border|border-t|rounded|rounded-md|cursor-pointer|cursor-context-menu|whitespace-pre-wrap|break-words|overflow-x-auto|min-h-screen|max-w-xl|min-w-0|w-40|font-mono|font-medium|list-decimal|tracking-widest|items-center|items-start|content-start|flex-wrap|flex-1|(?:gap|p|px|py|pt|pl|mt|mb|mx)-[\d.a-z-]+|text-(?:2xs|xs|sm|base|lg|primary|secondary|warning|base-content\/\d+)|bg-muted)$/;
    const found: string[] = [];
    for await (const rel of new Bun.Glob('**/*.{ts,js,html}').scan(root)) {
        if (rel.includes('.test.') || rel.endsWith('.d.ts') || rel.includes('$script_htmx')) continue;
        const source = await Bun.file(resolve(root, rel)).text();
        for (const m of source.matchAll(/class\s*[=:]\s*["'`]([^"'`]+)["'`]/g)) {
            for (const token of m[1]!.split(/\s+/)) if (utility.test(token)) found.push(`${rel}: ${token}`);
        }
    }
    expect(found).toEqual([]);
});
