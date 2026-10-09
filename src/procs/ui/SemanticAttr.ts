// The complete semantic vocabulary emitted by procs.ui.attr and consumed by
// screen vision and actions. Keep this closed: accepting arbitrary keys hides
// typos such as `acton`, which otherwise render inert data-* attributes.
export type SemanticAttr = {
    page?: string | number | null;
    section?: string | number | null;
    entity?: string | number | null;
    id?: string | number | null;
    status?: string | number | null;
    role?: string | number | null;
    form?: string | number | null;
    action?: string | number | null;
    field?: string | number | null;
};
