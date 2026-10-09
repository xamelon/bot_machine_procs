// A function that reads its own metadata: `ctx.fns` calls it with `this` set to
// the function object, where the loader put `meta`. Nothing is passed in and
// nothing is imported — it is the same trick as a Clojure var knowing its own
// name and file.
export default function (this: Self, _ctx: Context, _session: Session | null, _opts: {}): Meta {
    return this.meta;
}
