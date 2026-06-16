import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { QwenClient } from '../qwen/qwen.client';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
import { AgentFactory } from '../agents/core/agent-factory';
import { ConsensusEngine } from '../agents/core/consensus-engine';
import { TopologyMemoryService } from '../memory/topology-memory.service';
import { LearningService } from '../memory/learning.service';
import { MetaOrchestratorAgent } from '../agents/orchestrator/meta-orchestrator.agent';
import { Incident } from '../agents/core/types';
import { IncidentQueue } from './incident.queue';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { SlackService } from '../notifications/slack.service';
import { MetricWatcherService } from '../monitoring/metric-watcher.service';

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
    private checkpoints = new Map<string, (approved: boolean) => void>();

    constructor(
        private readonly qwen: QwenClient,
        private readonly bus: AgentMessageBusService,
        private readonly factory: AgentFactory,
        private readonly consensus: ConsensusEngine,
        private readonly memory: TopologyMemoryService,
        private readonly learning: LearningService,
        private readonly analytics: AnalyticsService,
        private readonly slack: SlackService,
        private readonly queue: IncidentQueue,
        private readonly watcher: MetricWatcherService,
    ) {
        this.watcher.setIncidentHandler((dto) => this.handleIncident(dto));
    }

    resolveCheckpoint(id: string, approved: boolean): void {
        const fn = this.checkpoints.get(id);
        if (fn) { fn(approved); this.checkpoints.delete(id); }
    }

    async waitForCheckpoint(id: string, timeoutMs = 120_000): Promise<boolean> {
        return new Promise((resolve) => {
            this.checkpoints.set(id, resolve);
            setTimeout(() => {
                if (this.checkpoints.has(id)) {
                    this.checkpoints.delete(id);
                    this.logger.warn(`Checkpoint ${id} timed out — auto-approving`);
                    resolve(true);
                }
            }, timeoutMs);
        });
    }

    async handleIncident(dto: CreateIncidentDto): Promise<void> {
        const incident: Incident = {
            id: uuidv4(),
            title: dto.title,
            description: dto.description,
            severity: dto.severity,
            metadata: { service: dto.service, ...dto.metadata },
            timestamp: Date.now(),
        };
        this.logger.log(`Incident: [${incident.severity}] ${incident.title}`);
        const priority = { P0: 4, P1: 3, P2: 2, P3: 1 }[dto.severity] ?? 2;

        this.queue.enqueue(incident.id, priority, async () => {
            const orchestrator = new MetaOrchestratorAgent(
                this.qwen, this.bus, this.factory, this.consensus, this.memory, this.learning, this.analytics, this.slack,
            );
            await orchestrator.processIncident(incident);
        });
    }
}