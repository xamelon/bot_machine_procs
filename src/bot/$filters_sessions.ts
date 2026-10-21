export default {
    label: "Sessions",
    filters: [
        { id: "core.sessions.flow", label: "Flow", group: "Session", type: "string", operators: ["eq", "contains"], column: "s.flow_id" },
        { id: "core.sessions.node", label: "Node", group: "Session", type: "string", operators: ["eq", "contains"], column: "s.current_node_id" },
        { id: "core.sessions.completed", label: "Completed", group: "Session", type: "boolean", operators: ["is"], column: "s.completed_at" },
    ],
};
