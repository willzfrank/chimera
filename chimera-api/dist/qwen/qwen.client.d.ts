import { AgentTool, ToolCall } from '../agents/core/types';
export interface QwenCompletionRequest {
    systemPrompt: string;
    messages: {
        role: 'user' | 'assistant';
        content: string;
    }[];
    tools?: AgentTool[];
    model?: 'qwen-max' | 'qwen-plus' | 'qwen-turbo';
    temperature?: number;
}
export interface QwenCompletionResponse {
    content: string;
    toolCalls: ToolCall[];
    usage: {
        promptTokens: number;
        completionTokens: number;
    };
}
export declare class QwenClient {
    private client;
    constructor();
    complete(req: QwenCompletionRequest): Promise<QwenCompletionResponse>;
}
