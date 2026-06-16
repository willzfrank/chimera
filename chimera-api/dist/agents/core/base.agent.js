"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
const uuid_1 = require("uuid");
class BaseAgent {
    spec;
    qwen;
    bus;
    agentId;
    role;
    name;
    status = 'idle';
    conversationHistory = [];
    constructor(spec, qwen, bus) {
        this.spec = spec;
        this.qwen = qwen;
        this.bus = bus;
        this.agentId = (0, uuid_1.v4)();
        this.role = spec.role;
        this.name = spec.name;
        this.bus.subscribe(this.agentId, (msg) => this.handleMessage(msg));
        this.bus.emitEvent({
            type: 'agent_spawned',
            payload: { agentId: this.agentId, role: this.role, name: this.name },
        });
    }
    async think(input, tools) {
        this.status = 'thinking';
        this.bus.emitEvent({
            type: 'agent_thinking',
            payload: { agentId: this.agentId, input },
        });
        this.conversationHistory.push({ role: 'user', content: input });
        const result = await this.qwen.complete({
            systemPrompt: this.spec.systemPrompt,
            messages: this.conversationHistory,
            tools: tools ?? this.spec.tools,
            model: this.role === 'meta-orchestrator' ? 'qwen-max' : 'qwen-plus',
        });
        this.conversationHistory.push({ role: 'assistant', content: result.content });
        const confidence = this.estimateConfidence(result.content);
        this.status = 'idle';
        return {
            agentId: this.agentId,
            content: result.content,
            toolCalls: result.toolCalls,
            confidence,
            timestamp: Date.now(),
        };
    }
    async sendTo(targetId, type, payload) {
        await this.bus.publish(targetId, {
            fromAgentId: this.agentId,
            toAgentId: targetId,
            type,
            payload,
        });
        await this.bus.emitEvent({
            type: 'agent_message',
            payload: { from: this.agentId, to: targetId, messageType: type },
        });
    }
    terminate() {
        this.status = 'terminated';
        this.bus.unsubscribe(this.agentId);
        this.bus.emitEvent({
            type: 'agent_terminated',
            payload: { agentId: this.agentId },
        });
    }
    estimateConfidence(content) {
        const hedgeWords = ['might', 'possibly', 'unclear', 'not sure', 'uncertain', 'maybe', 'could be'];
        const hits = hedgeWords.filter((w) => content.toLowerCase().includes(w)).length;
        return Math.max(0.1, 1 - hits * 0.15);
    }
}
exports.BaseAgent = BaseAgent;
//# sourceMappingURL=base.agent.js.map