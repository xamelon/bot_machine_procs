// GET /math — returning `{ title, main }` renders through ctx.layout for a full
// page load, and returns just the fragment (plus the host's chrome) for htmx.
export default function (ctx: Context, _session: Session, _opts: { req: Request }) {
    const rows = [1, 5, 10].map(n => ctx.fns.math.fib({ n }));
    return {
        title: "math",
        main: ctx.fns.procs.ui.page({
            page: "math",
            title: "Fibonacci",
            main: ctx.fns.procs.ui.table({
                columns: [{ key: "n", label: "n" }, { key: "fib", label: "fib(n)" }],
                rows, entity: "fib", rowId: "n",
            }),
        }),
    };
}
