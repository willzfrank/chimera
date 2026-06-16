"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const MAX_TOOL_ITERATIONS = 10;
const TOKEN_PRUNE_THRESHOLD = 6_000;
const HEDGE_WORDS = ['might', 'possibly', 'unclear', 'not sure', 'uncertain', 'maybe', 'could be', 'perhaps'];
class BaseAgent {
    spec;
    qwen;
    bus;
    logger;
    agentId;
    role;
    name;
    status = 'idle';
    correlationId;
    history = [];
    totalTokens = 0;
    constructor(spec, qwen, bus, correlationId) {
        this.spec = spec;
        this.qwen = qwen;
        this.bus = bus;
        this.agentId = (0, uuid_1.v4)();
        this.role = spec.role;
        this.name = spec.name;
        this.correlationId = correlationId ?? (0, uuid_1.v4)();
        this.logger = new common_1.Logger(`${this.name}[${this.agentId.slice(0, 8)}]`);
        this.bus.registerAgent(this.agentId, (msg) => this.handleMessage(msg));
        this.bus.emitEvent({
            type: 'agent_spawned',
            correlationId: this.correlationId,
            payload: { agentId: this.agentId, role: this.role, name: this.name },
        });
        this.logger.log(`Spawned — correlationId=${this.correlationId}`);
    }
    async think(input, toolExecutor, tools) {
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
                messages: this.history,
                tools: tools ?? this.spec.tools,
                model: this.role === 'meta-orchestrator' ? 'qwen-max' : 'qwen-plus',
            });
            this.totalTokens += result.usage.promptTokens + result.usage.completionTokens;
            if (!result.toolCalls.length) {
                finalContent = result.content;
                this.history.push({ role: 'assistant', content: result.content });
                break;
            }
            if (!toolExecutor) {
                finalContent = result.content;
                break;
            }
            this.history.push(result.rawAssistantMessage);
            const toolResults = await Promise.allSettled(result.toolCalls.map(async (tc) => {
                this.logger.debug(`Tool: ${tc.name}(${JSON.stringify(tc.arguments).slice(0, 120)})`);
                await this.bus.emitEvent({
                    type: 'tool_executed',
                    correlationId: this.correlationId,
                    payload: { agentId: this.agentId, tool: tc.name },
                });
                return { id: tc.id, output: await toolExecutor(tc.name, tc.arguments) };
            }));
            for (const r of toolResults) {
                if (r.status === 'fulfilled') {
                    this.history.push({ role: 'tool', content: JSON.stringify(r.value.output), tool_call_id: r.value.id });
                }
                else {
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
        this.logger.log(`Think done — tokens=${this.totalTokens}, confidence=${confidence.toFixed(2)}, toolIterations=${iterations}`);
        return { agentId: this.agentId, content: finalContent, confidence, timestamp: Date.now() };
    }
    async sendTo(targetId, type, payload) {
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
    terminate() {
        this.status = 'terminated';
        this.bus.unregister(this.agentId);
        this.bus.emitEvent({
            type: 'agent_terminated',
            correlationId: this.correlationId,
            payload: { agentId: this.agentId, agentName: this.name, totalTokens: this.totalTokens },
        });
        this.logger.log(`Terminated — totalTokens=${this.totalTokens}`);
    }
    pruneHistory() {
        const charCount = this.history.reduce((acc, m) => acc + (m.content?.length ?? 0), 0);
        if (charCount <= TOKEN_PRUNE_THRESHOLD * 4)
            return;
        const anchor = this.history[0];
        const recent = this.history.slice(-12);
        const pruned = this.history.length - recent.length - 1;
        this.history = anchor ? [anchor, ...recent] : recent;
        this.logger.warn(`Pruned ${pruned} history entries`);
    }
    estimateConfidence(content) {
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
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=base.agent.js.map