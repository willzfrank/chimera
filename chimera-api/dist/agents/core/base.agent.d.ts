import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from './agent-message-bus.service';
import { AgentMessage, AgentResponse, AgentRole, AgentSpec, AgentStatus, AgentTool } from './types';
export declare abstract class BaseAgent {
    protected readonly spec: AgentSpec;
    protected readonly qwen: QwenClient;
    protected readonly bus: AgentMessageBusService;
    readonly agentId: string;
    readonly role: AgentRole;
    readonly name: string;
    status: AgentStatus;
    protected conversationHistory: {
        role: 'user' | 'assistant';
        content: string;
    }[];
    constructor(spec: AgentSpec, qwen: QwenClient, bus: AgentMessageBusService);
    protected abstract handleMessage(msg: AgentMessage): Promise<void>;
    protected think(input: string, tools?: AgentTool[]): Promise<AgentResponse>;
    protected sendTo(targetId: string, type: AgentMessage['type'], payload: Record<string, unknown>): Promise<void>;
    terminate(): void;
    private estimateConfidence;
}
