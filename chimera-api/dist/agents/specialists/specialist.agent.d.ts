import { BaseAgent } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { IncidentToolsService } from '../../tools/incident-tools.service';
import { AgentMessage, AgentSpec } from '../core/types';
export declare class SpecialistAgent extends BaseAgent {
    private readonly toolsService;
    private readonly orchestratorId;
    constructor(spec: AgentSpec, qwen: QwenClient, bus: AgentMessageBusService, toolsService: IncidentToolsService, correlationId: string, orchestratorId: string);
    investigate(task: string): Promise<void>;
    protected handleMessage(msg: AgentMessage): Promise<void>;
}
