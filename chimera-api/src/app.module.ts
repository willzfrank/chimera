import { Module } from '@nestjs/common';
import { QwenClient } from './qwen/qwen.client';
import { AgentMessageBusService } from './agents/core/agent-message-bus.service';
import { ConsensusEngine } from './agents/core/consensus-engine';
import { AgentFactory } from './agents/core/agent-factory';
import { IncidentToolsService } from './tools/incident-tools.service';
import { IncidentService } from './incident/incident.service';
import { IncidentController } from './incident/incident.controller';

@Module({
  controllers: [IncidentController],
  providers: [
    QwenClient,
    AgentMessageBusService,
    IncidentToolsService,
    ConsensusEngine,
    AgentFactory,
    IncidentService,
  ],
})
export class AppModule { }