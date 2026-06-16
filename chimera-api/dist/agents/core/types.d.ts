export type AgentRole = 'meta-orchestrator' | 'topology-synthesizer' | 'specialist' | 'adversarial' | 'consensus' | 'postmortem';
export type AgentStatus = 'idle' | 'thinking' | 'done' | 'failed' | 'terminated';
export interface AgentMessage {
    id: string;
    fromAgentId: string;
    toAgentId: string;
    type: 'task' | 'result' | 'challenge' | 'consensus_request' | 'broadcast';
    payload: Record<string, unknown>;
    timestamp: number;
}
export interface AgentSpec {
    role: AgentRole;
    name: string;
    systemPrompt: string;
    tools: AgentTool[];
    adversarialPairId?: string;
}
export interface AgentTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
export interface TopologySpec {
    incidentClass: string;
    agents: AgentSpec[];
    communicationGraph: Record<string, string[]>;
}
export interface Incident {
    id: string;
    title: string;
    description: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    metadata: Record<string, unknown>;
    timestamp: number;
}
export interface AgentResponse {
    agentId: string;
    content: string;
    toolCalls?: ToolCall[];
    confidence: number;
    timestamp: number;
}
export interface ToolCall {
    name: string;
    arguments: Record<string, unknown>;
}
export interface ChimeraEvent {
    type: 'agent_spawned' | 'agent_thinking' | 'agent_message' | 'agent_terminated' | 'topology_built' | 'consensus_reached' | 'human_checkpoint' | 'incident_resolved';
    payload: Record<string, unknown>;
    timestamp: number;
}
