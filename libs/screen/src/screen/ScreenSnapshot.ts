// The shared semantic result of server and live browser vision.
export type ScreenSnapshot = {
    source: "server" | "browser";
    url: string;
    page: string | null;
    headings: Array<{ level: number; text: string }>;
    links: Array<{ href: string; text: string }>;
    markers: types.screen.Marker[];
    sections: types.screen.Marker[];
    entities: types.screen.Marker[];
    actions: types.screen.Marker[];
    forms: types.screen.Marker[];
    fields: types.screen.Marker[];
    roles: types.screen.Marker[];
    tables: Array<{
        columns: string[];
        rows: Array<{ entity?: string; id?: string; status?: string; cells: Record<string, string>; text: string }>;
    }>;
    diagnostics: Array<{ code: string; tag?: string; text?: string; href?: string; detail?: string }>;
    text?: string;
    status?: number;
    durationMs?: number;
    tabs?: Array<{ tab: string | null; label: string; active: boolean }>;
    notices?: Array<{ tone: string; text: string }>;
    invalid?: Array<{ field: string | null; error: string }>;
};
