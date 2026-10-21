export default {
    label: "Outbox",
    filters: [
        { id: "core.outbox.status", label: "Status", group: "Outbox", type: "string", operators: ["eq"], options: [{ value: "pending", label: "Pending" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }], column: "m.status" },
        { id: "core.outbox.channel", label: "Channel", group: "Outbox", type: "string", operators: ["eq", "contains"], column: "m.channel" },
        { id: "core.outbox.external_id", label: "External id", group: "Outbox", type: "string", operators: ["eq", "contains"], column: "m.external_id" },
        { id: "core.outbox.created_at", label: "Created", group: "Outbox", type: "datetime", operators: ["gte", "lte"], column: "m.created_at" },
    ],
};
