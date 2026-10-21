// Compare two screen.read answers without making a model scan both page dumps.
// Rows keep the same marker vocabulary as screen.read; only changed fields are
// repeated for an updated row.
export default async function (
    ctx: Context,
    _session: Session | null,
    opts: { before?: any; after?: any; from?: string },
) {
    const beforeScreen = opts.before ?? (opts.from ? ctx.state.screen?.snapshots?.[opts.from] : undefined);
    if (!beforeScreen) throw new Error(opts.from ? `screen snapshot not found: ${opts.from}` : "screen.diff needs before or from");
    const afterScreen = opts.after ?? await ctx.fns.screen.read({ mode: "browser" });
    const before = rows(beforeScreen);
    const after = rows(afterScreen);
    const added = [...after.entries()]
        .filter(([key]) => !before.has(key))
        .map(([, row]) => compact(row));
    const removed = [...before.entries()]
        .filter(([key]) => !after.has(key))
        .map(([, row]) => compact(row));
    const updated = [...after.entries()].flatMap(([key, row]) => {
        const previous = before.get(key);
        if (!previous) return [];
        const changes = changed(previous.item, row.item);
        return Object.keys(changes).length ? [{ kind: row.kind, key, changes }] : [];
    });
    const moved = beforeScreen?.url !== afterScreen?.url;
    const textChanged = beforeScreen?.text !== afterScreen?.text;

    return {
        changed: moved || textChanged || added.length > 0 || removed.length > 0 || updated.length > 0,
        url: afterScreen?.url ?? null,
        ...(moved ? { from: beforeScreen?.url ?? null } : {}),
        textChanged,
        added,
        removed,
        updated,
    };
}

const collections = ["entities", "actions", "forms", "sections", "notices", "invalid"] as const;
const identity = ["entity", "id", "action", "form", "field", "role", "section"];

type Row = { kind: string; key: string; item: any };

function rows(screen: any): Map<string, Row> {
    const result = new Map<string, Row>();
    for (const collection of collections) {
        const kind = collection === "entities" ? "entity" : collection.replace(/s$/, "");
        for (const [index, item] of (Array.isArray(screen?.[collection]) ? screen[collection] : []).entries()) {
            const marker = identity.flatMap(name => item?.[name] == null ? [] : [`${name}=${item[name]}`]).join("|");
            const key = `${kind}:${marker || index}`;
            result.set(key, { kind, key, item });
        }
    }
    return result;
}

function compact(row: Row) {
    const result: any = { kind: row.kind, key: row.key };
    for (const name of [...identity, "text", "status", "fields", "href"]) {
        if (row.item?.[name] !== undefined) result[name] = row.item[name];
    }
    return result;
}

function changed(before: any, after: any): Record<string, { before: any; after: any }> {
    const result: Record<string, { before: any; after: any }> = {};
    for (const name of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
        if (JSON.stringify(before?.[name]) === JSON.stringify(after?.[name])) continue;
        result[name] = { before: before?.[name] ?? null, after: after?.[name] ?? null };
    }
    return result;
}
