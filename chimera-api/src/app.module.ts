import { Module } from '@nestjs/common';
import { QwenClient } from './qwen/qwen.client';
import { AgentMessageBusService } from './agents/core/agent-message-bus.service';
import { ConsensusEngine } from './agents/core/consensus-engine';
import { AgentFactory } from './agents/core/agent-factory';
import { IncidentToolsService } from './tools/incident-tools.service';
import { IncidentService } from './incident/incident.service';
import { IncidentController } from './incident/incident.controller';
import { EventsGateway } from './gateway/events.gateway';
import { DbService } from './memory/db.service';
import { TopologyMemoryService } from './memory/topology-memory.service';

@Module({
  controllers: [IncidentController],
  providers: [
    QwenClient,
    AgentMessageBusService,
    IncidentToolsService,
    ConsensusEngine,
    AgentFactory,
    DbService,
    TopologyMemoryService,
    EventsGateway,
    IncidentService,
  ],
})
export class AppModule { }