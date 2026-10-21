// ctx.state.screen — the browser tabs connected to this process and the
// evaluations they have not answered yet. There is no browser in the server:
// code is injected into whatever page has this process open, and the answer
// comes back over the same stream.
export type State = {
    nextId: number;
    pending: Map<number, { resolve: (v: any) => void; reject: (e: any) => void; timer?: any }>;
    // Ephemeral named readScreen baselines used to compare a later screen.
    snapshots?: Record<string, any>;
    // Every live tab's last beacon, keyed by its stable sessionStorage id.
    tabs?: Record<string, { tabId: string; url: string; title: string; page: string | null; visible: boolean; at: string }>;
    // Compatibility: the most recently visible/updated tab.
    here?: { tabId?: string; url: string; title: string; page: string | null; visible?: boolean; at: string };
};
