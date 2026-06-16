import { Module } from '@nestjs/common';
import { QwenClient } from './qwen/qwen.client';
import { AgentMessageBusService } from './agents/core/agent-message-bus.service';
import { ConsensusEngine } from './agents/core/consensus-engine';
import { AgentFactory } from './agents/core/agent-factory';
import { IncidentToolsService } from './tools/incident-tools.service';
import { IncidentService } from './incident/incident.service';
import { IncidentQueue } from './incident/incident.queue';
import { IncidentController } from './incident/incident.controller';
import { EventsGateway } from './gateway/events.gateway';
import { DbService } from './memory/db.service';
import { TopologyMemoryService } from './memory/topology-memory.service';
import { LearningService } from './memory/learning.service';
import { AnalyticsService } from './analytics/analytics.service';
import { RiskService } from './analytics/risk.service';
import { AnalyticsController } from './analytics/analytics.controller';
import { WebhookController } from './webhooks/webhook.controller';
import { SlackService } from './notifications/slack.service';
import { MetricWatcherService } from './monitoring/metric-watcher.service';
import { MonitoringController } from './monitoring/monitoring.controller';

@Module({
  controllers: [IncidentController, AnalyticsController, WebhookController, MonitoringController],
  providers: [
    QwenClient,
    DbService,
    AgentMessageBusService,
    IncidentToolsService,
    ConsensusEngine,
    AgentFactory,
    TopologyMemoryService,
    LearningService,
    AnalyticsService,
    RiskService,
    SlackService,
    EventsGateway,
    IncidentQueue,
    IncidentService,
    MetricWatcherService,
  ],
})
export class AppModule { }