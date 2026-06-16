export type AgentRole =
    | 'meta-orchestrator'
    | 'topology-synthesizer'
    | 'specialist'
    | 'adversarial'
    | 'consensus';

export type AgentStatus = 'spawning' | 'idle' | 'thinking' | 'done' | 'terminated';

export interface ChimeraEvent {
    type: string;
    payload: Record<string, any>;
    correlationId?: string;
    timestamp: number;
}

export interface TopologyInfo {
    incidentClass: string;
    rationale: string;
    fromMemory: boolean;
    agents: { name: string; role: AgentRole; adversarialPairName?: string }[];
}

export interface ConsensusResult {
    agreed: boolean;
    decision: string;
    confidence: number;
    dissents: { agentId: string; reason: string }[];
    requiresHumanCheckpoint: boolean;
}

export interface HumanCheckpoint {
    id: string;
    summary: string;
    proposedAction: string;
    agentConsensus: ConsensusResult;
    createdAt: number;
}

export interface IncidentFormData {
    title: string;
    description: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    service: string;
}