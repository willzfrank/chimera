export type AgentRole = 'meta-orchestrator' | 'topology-synthesizer' | 'specialist' | 'adversarial' | 'consensus' | 'postmortem';
export type AgentStatus = 'idle' | 'thinking' | 'done' | 'failed' | 'terminated';
export interface AgentMessage {
    id: string;
    fromAgentId: string;
    toAgentId: string;
    type: 'task' | 'result' | 'challenge' | 'consensus_request' | 'broadcast';
    payload: Record<string, unknown>;
    correlationId: string;
    timestamp: number;
    retryCount?: number;
}
export interface AgentTool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
}
export interface AgentSpec {
    role: AgentRole;
    name: string;
    systemPrompt: string;
    tools: AgentTool[];
    adversarialPairName?: string;
}
export interface TopologySpec {
    incidentClass: string;
    agents: AgentSpec[];
    communicationGraph: Record<string, string[]>;
    rationale: string;
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
    confidence: number;
    timestamp: number;
}
export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}
export interface ConsensusResult {
    agreed: boolean;
    decision: string;
    confidence: number;
    dissents: {
        agentId: string;
        reason: string;
    }[];
    requiresHumanCheckpoint: boolean;
}
export interface HumanCheckpoint {
    id: string;
    correlationId: string;
    summary: string;
    proposedAction: string;
    risks: string[];
    agentConsensus: ConsensusResult;
    createdAt: number;
    resolvedAt?: number;
    approved?: boolean;
}
export type ChimeraEventType = 'agent_spawned' | 'agent_thinking' | 'agent_message' | 'agent_terminated' | 'topology_built' | 'consensus_reached' | 'human_checkpoint' | 'incident_resolved' | 'tool_executed' | 'circuit_breaker_opened' | 'message_dead_lettered';
export interface ChimeraEvent {
    type: ChimeraEventType;
    payload: Record<string, unknown>;
    correlationId?: string;
    timestamp: number;
}
