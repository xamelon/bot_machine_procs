export default {
    label: "Users",
    filters: [
        { id: "core.user.name", label: "Name", group: "User", type: "string", operators: ["eq", "contains", "missing"], column: "u.display_name" },
        { id: "core.user.external_id", label: "External id", group: "User", type: "string", operators: ["eq", "contains"], column: "u.external_id" },
        { id: "core.user.channel", label: "Channel", group: "User", type: "string", operators: ["eq"], options: [{ value: "telegram", label: "Telegram" }, { value: "vk", label: "VK" }, { value: "echo", label: "Echo" }], column: "u.channel" },
        { id: "core.user.created_at", label: "Created", group: "User", type: "datetime", operators: ["gte", "lte"], column: "u.created_at" },
        { id: "core.user.blocked", label: "Blocked", group: "User", type: "boolean", operators: ["is"], column: "u.blocked_at" },
    ],
};
