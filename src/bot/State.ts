// One runtime owns one database. Survives function hot reload, not process restart.
export type State = {
    processing?: boolean;
    sending?: boolean;
    recovered?: boolean;
    inboxTimer?: ReturnType<typeof setInterval>;
    outboxTimer?: ReturnType<typeof setInterval>;
    apps?: Record<string, { title: string; icon?: string; group?: string; permission?: string; order?: number; open: string; name: string }>;
};
