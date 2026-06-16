import { Logger } from '@nestjs/common';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from './agent-message-bus.service';
import { AgentMessage, AgentResponse, AgentRole, AgentSpec, AgentStatus, AgentTool } from './types';
export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<unknown>;
export declare abstract class BaseAgent {
    protected readonly spec: AgentSpec;
    protected readonly qwen: QwenClient;
    protected readonly bus: AgentMessageBusService;
    protected readonly logger: Logger;
    readonly agentId: string;
    readonly role: AgentRole;
    readonly name: string;
    status: AgentStatus;
    protected correlationId: string;
    private history;
    private totalTokens;
    constructor(spec: AgentSpec, qwen: QwenClient, bus: AgentMessageBusService, correlationId?: string);
    protected abstract handleMessage(msg: AgentMessage): Promise<void>;
    protected think(input: string, toolExecutor?: ToolExecutor, tools?: AgentTool[]): Promise<AgentResponse>;
    protected sendTo(targetId: string, type: AgentMessage['type'], payload: Record<string, unknown>): Promise<void>;
    terminate(): void;
    private pruneHistory;
    private estimateConfidence;
    getMetrics(): {
        agentId: string;
        role: AgentRole;
        name: string;
        status: AgentStatus;
        totalTokens: number;
        historyLength: number;
        correlationId: string;
    };
}
