export default {
    label: "Inbox",
    filters: [
        { id: "core.inbox.status", label: "Status", group: "Inbox", type: "string", operators: ["eq"], options: [{ value: "pending", label: "Pending" }, { value: "processing", label: "Processing" }, { value: "processed", label: "Processed" }, { value: "failed", label: "Failed" }], column: "e.status" },
        { id: "core.inbox.channel", label: "Channel", group: "Inbox", type: "string", operators: ["eq", "contains"], column: "e.channel" },
        { id: "core.inbox.external_id", label: "External id", group: "Inbox", type: "string", operators: ["eq", "contains"], column: "e.external_id" },
        { id: "core.inbox.created_at", label: "Created", group: "Inbox", type: "datetime", operators: ["gte", "lte"], column: "e.created_at" },
    ],
};
