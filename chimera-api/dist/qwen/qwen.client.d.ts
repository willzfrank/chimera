import { AgentTool, ToolCall } from '../agents/core/types';
export interface QwenMessage {
    role: 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
}
export interface QwenCompletionRequest {
    systemPrompt: string;
    messages: QwenMessage[];
    tools?: AgentTool[];
    model?: 'qwen-max' | 'qwen-plus' | 'qwen-turbo';
    temperature?: number;
    maxTokens?: number;
}
export interface QwenCompletionResponse {
    content: string;
    toolCalls: ToolCall[];
    rawAssistantMessage: {
        role: 'assistant';
        content: string | null;
        tool_calls?: Array<{
            id: string;
            type: 'function';
            function: {
                name: string;
                arguments: string;
            };
        }>;
    };
    usage: {
        promptTokens: number;
        completionTokens: number;
    };
    model: string;
}
export declare class QwenClient {
    private readonly logger;
    private readonly client;
    private cb;
    private totalUsage;
    private onCircuitOpen?;
    constructor();
    setCircuitOpenCallback(fn: () => void): void;
    complete(req: QwenCompletionRequest): Promise<QwenCompletionResponse>;
    private doComplete;
    private assertCircuitClosed;
    private onSuccess;
    private onFailure;
    private withRetry;
    getMetrics(): {
        circuitBreaker: {
            failures: number;
            lastFailure: number;
            state: "closed" | "open" | "half-open";
        };
        promptTokens: number;
        completionTokens: number;
        requests: number;
    };
    private sleep;
}
