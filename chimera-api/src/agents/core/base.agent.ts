import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from './agent-message-bus.service';
import { AgentMessage, AgentResponse, AgentRole, AgentSpec, AgentStatus, AgentTool } from './types';

type HistoryEntry =
    | { role: 'user'; content: string }
    | { role: 'assistant'; content: string | null; tool_calls?: any[] }
    | { role: 'tool'; content: string; tool_call_id: string };

export type ToolExecutor = (name: string, args: Record<string, unknown>) => Promise<unknown>;

const MAX_TOOL_ITERATIONS = 10;
const TOKEN_PRUNE_THRESHOLD = 6_000; // chars / 4 ≈ tokens
const HEDGE_WORDS = ['might', 'possibly', 'unclear', 'not sure', 'uncertain', 'maybe', 'could be', 'perhaps'];

export abstract class BaseAgent {
    protected readonly logger: Logger;

    readonly agentId: string;
    readonly role: AgentRole;
    readonly name: string;
    status: AgentStatus = 'idle';

    protected correlationId: string;
    private history: HistoryEntry[] = [];
    private totalTokens = 0;

    constructor(
        protected readonly spec: AgentSpec,
        protected readonly qwen: QwenClient,
        protected readonly bus: AgentMessageBusService,
        correlationId?: string,
    ) {
        this.agentId = uuidv4();
        this.role = spec.role;
        this.name = spec.name;
        this.correlationId = correlationId ?? uuidv4();
        this.logger = new Logger(`${this.name}[${this.agentId.slice(0, 8)}]`);

        this.bus.registerAgent(this.agentId, (msg) => this.handleMessage(msg));

        this.bus.emitEvent({
            type: 'agent_spawned',
            correlationId: this.correlationId,
            payload: { agentId: this.agentId, role: this.role, name: this.name },
        });

        this.logger.log(`Spawned — correlationId=${this.correlationId}`);
    }

    protected abstract handleMessage(msg: AgentMessage): Promise<void>;

    /**
     * Full reasoning loop with automatic multi-turn tool execution.
     * Runs until Qwen returns a plain text response (no tool_calls).
     */
    protected async think(
        input: string,
        toolExecutor?: ToolExecutor,
        tools?: AgentTool[],
    ): Promise<AgentResponse> {
        this.status = 'thinking';

        await this.bus.emitEvent({
            type: 'agent_thinking',
            correlationId: this.correlationId,
            payload: { agentId: this.agentId, agentName: this.name, inputPreview: input.slice(0, 200) },
        });

        this.history.push({ role: 'user', content: input });
        this.pruneHistory();

        let finalContent = '';
        let iterations = 0;

        while (iterations < MAX_TOOL_ITERATIONS) {
            const result = await this.qwen.complete({
                systemPrompt: this.spec.systemPrompt,
                messages: this.history as any,
                tools: tools ?? this.spec.tools,
                model: this.role === 'meta-orchestrator' ? 'qwen-max' : 'qwen-plus',
            });

            this.totalTokens += result.usage.promptTokens + result.usage.completionTokens;

            const costUsd = ((result.usage.promptTokens + result.usage.completionTokens) / 1000) * 0.0004;
            await this.bus.emitEvent({
                type: 'tokens_consumed' as any,
                correlationId: this.correlationId,
                payload: {
                    agentId: this.agentId,
                    agentName: this.name,
                    promptTokens: result.usage.promptTokens,
                    completionTokens: result.usage.completionTokens,
                    costUsd,
                    model: result.model,
                },
            });

            if (!result.toolCalls.length) {
                finalContent = result.content;
                this.history.push({ role: 'assistant', content: result.content });
                break;
            }

            if (!toolExecutor) {
                finalContent = result.content;
                break;
            }

            // Push raw assistant message — preserves tool_calls array with IDs
            this.history.push(result.rawAssistantMessage);

            const toolResults = await Promise.allSettled(
                result.toolCalls.map(async (tc) => {
                    this.logger.debug(`Tool: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 120)})`);
                    await this.bus.emitEvent({
                        type: 'tool_executed',
                        correlationId: this.correlationId,
                        payload: { agentId: this.agentId, tool: tc.name },
                    });
                    return { id: tc.id, output: await toolExecutor(tc.name, tc.arguments) };
                }),
            );

            // Each tool result MUST carry the matching tool_call_id
            for (const r of toolResults) {
                if (r.status === 'fulfilled') {
                    this.history.push({ role: 'tool', content: JSON.stringify(r.value.output), tool_call_id: r.value.id });
                } else {
                    // Even failures need a valid tool_call_id to not break the conversation
                    const idx = toolResults.indexOf(r);
                    const id = result.toolCalls[idx]?.id ?? `fallback_${idx}`;
                    this.history.push({ role: 'tool', content: JSON.stringify({ error: r.reason?.message ?? 'Tool failed' }), tool_call_id: id });
                }
            }

            iterations++;
        }

        if (iterations >= MAX_TOOL_ITERATIONS) {
            this.logger.error(`Max tool iterations hit — forcing exit`);
        }

        this.status = 'idle';
        const confidence = this.estimateConfidence(finalContent);

        this.logger.log(
            `Think done — tokens=${this.totalTokens}, confidence=${confidence.toFixed(2)}, toolIterations=${iterations}`,
        );

        return { agentId: this.agentId, content: finalContent, confidence, timestamp: Date.now() };
    }

    protected async sendTo(
        targetId: string,
        type: AgentMessage['type'],
        payload: Record<string, unknown>,
    ): Promise<void> {
        await this.bus.publish(targetId, {
            fromAgentId: this.agentId,
            toAgentId: targetId,
            type,
            payload: { ...payload, correlationId: this.correlationId },
            correlationId: this.correlationId,
        });

        await this.bus.emitEvent({
            type: 'agent_message',
            correlationId: this.correlationId,
            payload: { from: this.agentId, to: targetId, messageType: type },
        });
    }

    terminate(): void {
        this.status = 'terminated';
        this.bus.unregister(this.agentId);
        this.bus.emitEvent({
            type: 'agent_terminated',
            correlationId: this.correlationId,
            payload: { agentId: this.agentId, agentName: this.name, totalTokens: this.totalTokens },
        });
        this.logger.log(`Terminated — totalTokens=${this.totalTokens}`);
    }

    /**
     * Prune oldest history entries when approaching context budget.
     * Always keeps the first user message (incident context) + last 12 entries.
     */
    private pruneHistory(): void {
        const charCount = this.history.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
        if (charCount <= TOKEN_PRUNE_THRESHOLD * 4) return;

        const anchor = this.history[0];
        const recent = this.history.slice(-12);
        const pruned = this.history.length - recent.length - 1;
        this.history = anchor ? [anchor, ...recent] : recent;
        this.logger.warn(`Pruned ${pruned} history entries`);
    }


    private estimateConfidence(content: string): number {
        const lower = content.toLowerCase();
        const hedges = HEDGE_WORDS.filter((w) => lower.includes(w)).length;
        const lengthBonus = content.length > 300 ? 0.1 : 0;
        return Math.min(1, Math.max(0.1, 1 - hedges * 0.12 + lengthBonus));
    }

    getMetrics() {
        return {
            agentId: this.agentId,
            role: this.role,
            name: this.name,
            status: this.status,
            totalTokens: this.totalTokens,
            historyLength: this.history.length,
            correlationId: this.correlationId,
        };
    }
}