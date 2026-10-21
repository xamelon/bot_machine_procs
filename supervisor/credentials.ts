import { mkdir, readFile, open, rename, chmod, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import type { CreateModelsOptions } from "@earendil-works/pi-ai/models";

type Store = NonNullable<CreateModelsOptions["credentials"]>;
type Credential = NonNullable<Awaited<ReturnType<Store["read"]>>>;

// Only the agent worker opens this store; serialize all writes, including token refresh.
export default async function credentials(path: string): Promise<Store> {
    await mkdir(dirname(path), { recursive: true, mode: 0o700 });
    await chmod(dirname(path), 0o700);
    let data: Record<string, Credential> = Object.create(null);
    try { data = Object.assign(Object.create(null), JSON.parse(await readFile(path, "utf8"))); await chmod(path, 0o600); }
    catch (e: any) { if (e.code !== "ENOENT") throw e; }
    let chain: Promise<unknown> = Promise.resolve();
    function enqueue<T>(fn: () => Promise<T>): Promise<T> {
        const next = chain.then(fn, fn);
        chain = next.catch(() => {});
        return next;
    }
    async function save(next: typeof data) {
        const temp = `${path}.${crypto.randomUUID()}.tmp`;
        try {
            const file = await open(temp, "wx", 0o600);
            try { await file.writeFile(JSON.stringify(next)); await file.sync(); } finally { await file.close(); }
            await rename(temp, path);
            data = next;
        } finally { await unlink(temp).catch(() => {}); }
    }
    return {
        async read(id) { return data[id] ? structuredClone(data[id]) : undefined; },
        async list() { return Object.entries(data).map(([providerId, c]) => ({ providerId, type: c.type })); },
        modify(id, fn, options) { return enqueue(async () => {
            options?.signal?.throwIfAborted();
            const value = await fn(data[id] ? structuredClone(data[id]) : undefined);
            options?.signal?.throwIfAborted();
            if (value) await save(Object.assign(Object.create(null), data, { [id]: value }));
            return data[id] ? structuredClone(data[id]) : undefined;
        }); },
        delete(id, options) { return enqueue(async () => {
            options?.signal?.throwIfAborted();
            const next = Object.assign(Object.create(null), data); delete next[id]; await save(next);
        }); },
    };
}
