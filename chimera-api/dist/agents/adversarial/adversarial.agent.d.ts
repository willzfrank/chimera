import { BaseAgent } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { AgentMessage, AgentSpec } from '../core/types';
export declare class AdversarialAgent extends BaseAgent {
    private readonly targetAgentId;
    private readonly orchestratorId;
    constructor(spec: AgentSpec, qwen: QwenClient, bus: AgentMessageBusService, correlationId: string, targetAgentId: string, orchestratorId: string);
    challenge(specialistAnalysis: string, originalTask: string): Promise<void>;
    protected handleMessage(msg: AgentMessage): Promise<void>;
}
