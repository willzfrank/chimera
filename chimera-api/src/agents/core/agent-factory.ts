import { Injectable } from '@nestjs/common';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from './agent-message-bus.service';
import { IncidentToolsService } from '../../tools/incident-tools.service';
import { TopologySynthesizerAgent } from '../topology/topology-synthesizer.agent';
import { SpecialistAgent } from '../specialists/specialist.agent';
import { AgentSpec } from './types';
import { AdversarialAgent } from '../adversarial/adversarial.agent';

@Injectable()
export class AgentFactory {
    constructor(
        private readonly qwen: QwenClient,
        private readonly bus: AgentMessageBusService,
        private readonly tools: IncidentToolsService,
    ) { }

    createTopologySynthesizer(correlationId: string): TopologySynthesizerAgent {
        return new TopologySynthesizerAgent(this.qwen, this.bus, correlationId);
    }

    createSpecialist(spec: AgentSpec, correlationId: string, orchestratorId: string): SpecialistAgent {
        return new SpecialistAgent(spec, this.qwen, this.bus, this.tools, correlationId, orchestratorId);
    }

    createAdversarial(
        spec: AgentSpec,
        correlationId: string,
        targetAgentId: string,
        orchestratorId: string,
    ): AdversarialAgent {
        return new AdversarialAgent(spec, this.qwen, this.bus, correlationId, targetAgentId, orchestratorId);
    }
}