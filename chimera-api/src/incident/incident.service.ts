import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { QwenClient } from '../qwen/qwen.client';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
import { AgentFactory } from '../agents/core/agent-factory';
import { ConsensusEngine } from '../agents/core/consensus-engine';
import { TopologyMemoryService } from '../memory/topology-memory.service';
import { MetaOrchestratorAgent } from '../agents/orchestrator/meta-orchestrator.agent';
import { ConsensusResult, Incident } from '../agents/core/types';

export class CreateIncidentDto {
    title: string;
    description: string;
    severity: 'P0' | 'P1' | 'P2' | 'P3';
    service: string;
    metadata?: Record<string, unknown>;
}

@Injectable()
export class IncidentService {
    private readonly logger = new Logger(IncidentService.name);

    constructor(
        private readonly qwen: QwenClient,
        private readonly bus: AgentMessageBusService,
        private readonly factory: AgentFactory,
        private readonly consensus: ConsensusEngine,
        private readonly memory: TopologyMemoryService,
    ) { }

    async handleIncident(dto: CreateIncidentDto): Promise<ConsensusResult> {
        const incident: Incident = {
            id: uuidv4(),
            title: dto.title,
            description: dto.description,
            severity: dto.severity,
            metadata: { service: dto.service, ...dto.metadata },
            timestamp: Date.now(),
        };
        this.logger.log(`Incident: [${incident.severity}] ${incident.title}`);
        const orchestrator = new MetaOrchestratorAgent(
            this.qwen, this.bus, this.factory, this.consensus, this.memory,
        );
        return orchestrator.processIncident(incident);
    }
}