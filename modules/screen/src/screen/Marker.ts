// One semantically addressable HTML element shared by server and live browser
// vision. Live snapshots may add computed visibility and geometry.
export type Marker = {
    tag: string;
    own: string[];
    page?: string;
    section?: string;
    entity?: string;
    id?: string;
    status?: string;
    role?: string;
    form?: string;
    action?: string;
    field?: string;
    href?: string;
    links: Array<{ href: string; text: string }>;
    text: string;
    disabled?: boolean;
    checked?: boolean;
    value?: string;
    fields?: string[];
    parent?: number;
    visible?: boolean;
    rect?: { x: number; y: number; width: number; height: number };
};
