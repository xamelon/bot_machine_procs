// Flow JSON as stored in bot_flow_versions.definition. String keys, same contract
// as bot_machine docs/flow-definition.md.
export type Definition = {
    id: string;
    version?: number;
    start_node_id: string;
    nodes?: Record<string, any>[];
};
