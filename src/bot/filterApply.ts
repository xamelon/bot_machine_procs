type Leaf = { filter: string; op: string; value?: any };
type Node = Leaf | { all?: Node[]; any?: Node[]; not?: Node };

export default function (ctx: Context, _session: Session | null, opts: { subject: string; tree?: any; q?: string }) {
    const subject = ctx.state.bot?.filters?.[opts.subject];
    const catalog = subject?.filters ?? [];
    const params: any[] = [];
    try {
        const where = compile(opts.tree ?? { all: [] }, catalog, params);
        const text = textSearch(opts.q, subject?.search ?? catalog.filter((item: any) => item.type === "string").map((item: any) => item.column), params);
        return { ok: true, where: text ? `(${where}) AND (${text})` : where, params };
    } catch (error: any) {
        return { ok: false, error: String(error?.message ?? error), where: "1=0", params: [] };
    }
}

function textSearch(q: string | undefined, columns: string[], params: any[]) {
    const text = q?.trim();
    if (!text) return "";
    if (!columns.length) throw new Error("this subject has no text search");
    for (const column of columns) if (!/^[\w.]+$/.test(column)) throw new Error(`invalid column: ${column}`);
    params.push(...columns.map(() => `%${text}%`));
    return columns.map(column => `${column} LIKE ?`).join(" OR ");
}

function compile(node: Node, catalog: any[], params: any[]): string {
    if (node && typeof (node as Leaf).filter === "string") return leaf(node as Leaf, catalog, params);
    if ((node as any)?.all) {
        const items = (node as any).all as Node[];
        if (!items.length) return "1=1";
        return `(${items.map(item => compile(item, catalog, params)).join(" AND ")})`;
    }
    if ((node as any)?.any) {
        const items = (node as any).any as Node[];
        if (!items.length) throw new Error("any-group cannot be empty");
        return `(${items.map(item => compile(item, catalog, params)).join(" OR ")})`;
    }
    if ((node as any)?.not) return `(NOT ${compile((node as any).not, catalog, params)})`;
    throw new Error("invalid filter tree");
}

function leaf(node: Leaf, catalog: any[], params: any[]): string {
    const def = catalog.find(item => item.id === node.filter);
    if (!def) throw new Error(`unknown filter: ${node.filter}`);
    if (!def.operators.includes(node.op)) throw new Error(`invalid operator: ${node.op}`);
    if (!/^[\w.]+$/.test(def.column)) throw new Error(`invalid column: ${def.column}`);
    const col = def.column;
    if (node.op === "missing") return `(${col} IS NULL OR ${col} = '')`;
    if (node.op === "exists") return `(${col} IS NOT NULL AND ${col} != '')`;
    if (node.op === "is" && def.type === "boolean") return node.value === false || node.value === "false" ? `${col} IS NULL` : `${col} IS NOT NULL`;
    if (node.op === "contains") { params.push(`%${node.value ?? ""}%`); return `${col} LIKE ?`; }
    params.push(node.value ?? "");
    return `${col} ${node.op === "gte" ? ">=" : node.op === "lte" ? "<=" : "="} ?`;
}
