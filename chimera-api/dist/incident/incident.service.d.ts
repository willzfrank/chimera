import { QwenClient } from '../qwen/qwen.client';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
import { AgentFactory } from '../agents/core/agent-factory';
import { ConsensusEngine } from '../agents/core/consensus-engine';
import { TopologyMemoryService } from '../memory/topology-memory.service';
import { ConsensusResult } from '../agents/core/types';
import { AnalyticsService } from "../analytics/analytics.service";
import { SlackService } from '../notifications/slack.service';
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
    private readonly analytics;
    private readonly slack;
    private readonly logger;
    private checkpoints;
    constructor(qwen: QwenClient, bus: AgentMessageBusService, factory: AgentFactory, consensus: ConsensusEngine, memory: TopologyMemoryService, analytics: AnalyticsService, slack: SlackService);
    resolveCheckpoint(id: string, approved: boolean): void;
    waitForCheckpoint(id: string, timeoutMs?: number): Promise<boolean>;
    handleIncident(dto: CreateIncidentDto): Promise<ConsensusResult>;
}
