import { QwenClient } from '../qwen/qwen.client';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
import { AgentFactory } from '../agents/core/agent-factory';
import { ConsensusEngine } from '../agents/core/consensus-engine';
import { TopologyMemoryService } from '../memory/topology-memory.service';
import { ConsensusResult } from '../agents/core/types';
export declare class CreateIncidentDto {
    title: string;
    description: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    service: string;
    metadata?: Record<string, unknown>;
}
export declare class IncidentService {
    private readonly qwen;
    private readonly bus;
    private readonly factory;
    private readonly consensus;
    private readonly memory;
    private readonly logger;
    constructor(qwen: QwenClient, bus: AgentMessageBusService, factory: AgentFactory, consensus: ConsensusEngine, memory: TopologyMemoryService);
    handleIncident(dto: CreateIncidentDto): Promise<ConsensusResult>;
}
