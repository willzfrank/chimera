import { BaseAgent } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { AgentMessage, Incident, TopologySpec } from '../core/types';
export declare class TopologySynthesizerAgent extends BaseAgent {
    constructor(qwen: QwenClient, bus: AgentMessageBusService, correlationId: string);
    synthesize(incident: Incident, priorPatterns?: string[]): Promise<TopologySpec>;
    private buildTopologySpec;
    private resolveTools;
    protected handleMessage(_msg: AgentMessage): Promise<void>;
}
