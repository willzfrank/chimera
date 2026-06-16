import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { AgentTool, ToolCall } from '../agents/core/types';

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    state: 'closed' | 'open' | 'half-open';
}

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
        tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    };
    usage: { promptTokens: number; completionTokens: number };
    model: string;
}


const CB_FAILURE_THRESHOLD = 5;
const CB_RESET_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;

@Injectable()
export class QwenClient {
    private readonly logger = new Logger(QwenClient.name);
    private readonly client: OpenAI;

    private cb: CircuitBreakerState = { failures: 0, lastFailure: 0, state: 'closed' };
    private totalUsage = { promptTokens: 0, completionTokens: 0, requests: 0 };
    private onCircuitOpen?: () => void;

    constructor() {
        this.client = new OpenAI({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
            timeout: 30_000,
        });
    }

    setCircuitOpenCallback(fn: () => void): void {
        this.onCircuitOpen = fn;
    }

    async complete(req: QwenCompletionRequest): Promise<QwenCompletionResponse> {
        this.assertCircuitClosed();
        return this.withRetry(() => this.doComplete(req));
    }

    private async doComplete(req: QwenCompletionRequest): Promise<QwenCompletionResponse> {
        const tools = req.tools?.map((t) => ({
            type: 'function' as const,
            function: { name: t.name, description: t.description, parameters: t.parameters },
        }));

        try {
            const response = await this.client.chat.completions.create({
                model: req.model ?? 'qwen-plus',
                temperature: req.temperature ?? 0.3,
                max_tokens: req.maxTokens ?? 4_096,
                messages: [{ role: 'system', content: req.systemPrompt }, ...(req.messages as any[])],
                ...(tools?.length ? { tools } : {}),
            });

            const choice = response.choices[0];

            const toolCalls: ToolCall[] = (choice.message.tool_calls ?? [])
                .filter((tc): tc is Extract<typeof tc, { type: 'function' }> => tc.type === 'function')
                .map((tc) => ({
                    id: tc.id,                              // ← include ID
                    name: tc.function.name,
                    arguments: JSON.parse(tc.function.arguments),
                }));

            const rawAssistantMessage = {
                role: 'assistant' as const,
                content: choice.message.content ?? null,
                ...(choice.message.tool_calls?.length ? { tool_calls: choice.message.tool_calls } : {}),
            };

            const usage = {
                promptTokens: response.usage?.prompt_tokens ?? 0,
                completionTokens: response.usage?.completion_tokens ?? 0,
            };

            this.totalUsage.promptTokens += usage.promptTokens;
            this.totalUsage.completionTokens += usage.completionTokens;
            this.totalUsage.requests++;

            this.onSuccess();
            this.logger.debug(
                `[${req.model ?? 'qwen-plus'}] ${usage.promptTokens}p+${usage.completionTokens}c tokens | total=${this.totalUsage.promptTokens + this.totalUsage.completionTokens}`,
            );
            return {
                content: choice.message.content ?? '',
                toolCalls,
                rawAssistantMessage: rawAssistantMessage as unknown as { role: 'assistant'; content: string | null; tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }> },
                usage: { promptTokens: response.usage?.prompt_tokens ?? 0, completionTokens: response.usage?.completion_tokens ?? 0 },
                model: response.model,
            };
        } catch (err) {
            this.onFailure();
            throw err;
        }
    }

    private assertCircuitClosed(): void {
        if (this.cb.state !== 'open') return;

        const elapsed = Date.now() - this.cb.lastFailure;
        if (elapsed > CB_RESET_MS) {
            this.cb.state = 'half-open';
            this.logger.warn('Circuit breaker → half-open, probing');
            return;
        }

        const retryIn = Math.ceil((CB_RESET_MS - elapsed) / 1_000);
        throw new Error(`Circuit breaker OPEN — retry in ${retryIn}s`);
    }

    private onSuccess(): void {
        if (this.cb.state === 'half-open') {
            this.cb = { failures: 0, lastFailure: 0, state: 'closed' };
            this.logger.log('Circuit breaker → closed');
        }
        if (this.cb.state === 'closed') this.cb.failures = 0;
    }

    private onFailure(): void {
        this.cb.failures++;
        this.cb.lastFailure = Date.now();
        if (this.cb.failures >= CB_FAILURE_THRESHOLD) {
            this.cb.state = 'open';
            this.logger.error(`Circuit breaker OPEN after ${this.cb.failures} failures`);
            this.onCircuitOpen?.();
        }
    }

    private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastErr: unknown;

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (err: any) {
                lastErr = err;
                const retryable = err.status === 429 || err.status >= 500;
                if (!retryable) throw err;

                // Exponential backoff with full jitter
                const delay = Math.min(
                    BASE_RETRY_DELAY_MS * 2 ** attempt + Math.random() * 500,
                    10_000,
                );
                this.logger.warn(`Qwen ${err.status} — retrying in ${delay.toFixed(0)}ms (${attempt + 1}/${MAX_RETRIES})`);
                await this.sleep(delay);
            }
        }
        throw lastErr;
    }

    getMetrics() {
        return { ...this.totalUsage, circuitBreaker: { ...this.cb } };
    }

    private sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
}