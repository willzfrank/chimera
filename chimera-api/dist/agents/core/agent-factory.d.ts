import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from './agent-message-bus.service';
import { IncidentToolsService } from '../../tools/incident-tools.service';
import { TopologySynthesizerAgent } from '../topology/topology-synthesizer.agent';
import { SpecialistAgent } from '../specialists/specialist.agent';
import { AgentSpec } from './types';
import { AdversarialAgent } from '../adversarial/adversarial.agent';
export declare class AgentFactory {
    private readonly qwen;
    private readonly bus;
    private readonly tools;
    constructor(qwen: QwenClient, bus: AgentMessageBusService, tools: IncidentToolsService);
    createTopologySynthesizer(correlationId: string): TopologySynthesizerAgent;
    createSpecialist(spec: AgentSpec, correlationId: string, orchestratorId: string): SpecialistAgent;
    createAdversarial(spec: AgentSpec, correlationId: string, targetAgentId: string, orchestratorId: string): AdversarialAgent;
}
