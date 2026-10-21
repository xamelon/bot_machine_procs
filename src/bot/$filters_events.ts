export default {
    label: "Events",
    filters: [
        { id: "core.events.type", label: "Type", group: "Event", type: "string", operators: ["eq", "contains"], column: "e.event_type" },
        { id: "core.events.flow", label: "Flow", group: "Event", type: "string", operators: ["eq", "contains"], column: "e.flow_id" },
        { id: "core.events.node", label: "Node", group: "Event", type: "string", operators: ["eq", "contains", "missing"], column: "e.node_id" },
        { id: "core.events.created_at", label: "Created", group: "Event", type: "datetime", operators: ["gte", "lte"], column: "e.created_at" },
    ],
};
