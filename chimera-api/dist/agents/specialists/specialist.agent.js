"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialistAgent = void 0;
const base_agent_1 = require("../core/base.agent");
class SpecialistAgent extends base_agent_1.BaseAgent {
    toolsService;
    orchestratorId;
    constructor(spec, qwen, bus, toolsService, correlationId, orchestratorId) {
        super(spec, qwen, bus, correlationId);
        this.toolsService = toolsService;
        this.orchestratorId = orchestratorId;
    }
    async investigate(task) {
        this.logger.log(`Investigating: ${task.slice(0, 100)}`);
        const toolExecutor = (name, args) => this.toolsService.execute(name, args);
        const response = await this.think(task, toolExecutor);
        await this.sendTo(this.orchestratorId, 'result', {
            type: 'specialist_result',
            agentId: this.agentId,
            agentName: this.name,
            content: response.content,
            confidence: response.confidence,
        });
        await this.bus.emitEvent({
            type: 'agent_done',
            correlationId: this.correlationId,
            payload: {
                agentId: this.agentId,
                agentName: this.name,
                confidence: response.confidence,
                role: this.role,
            },
        });
        this.logger.log(`Investigation done — confidence=${response.confidence.toFixed(2)}`);
    }
    async handleMessage(msg) {
        if (msg.type === 'task') {
            await this.investigate(msg.payload.task);
        }
    }
}
exports.SpecialistAgent = SpecialistAgent;
//# sourceMappingURL=specialist.agent.js.map