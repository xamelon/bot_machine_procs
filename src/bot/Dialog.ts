// In-memory run of a conversation. Not Session.ts — that name merges into the HTTP session.
export type Dialog = {
    id?: number;
    channel: string;
    externalId: string;
    flowId: string;
    flowVersion?: number;
    currentNodeId: string;
    context: Record<string, any>;
    completed: boolean;
};
