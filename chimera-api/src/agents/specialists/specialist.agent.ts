import { BaseAgent, ToolExecutor } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { IncidentToolsService } from '../../tools/incident-tools.service';
import { AgentMessage, AgentSpec } from '../core/types';

export class SpecialistAgent extends BaseAgent {
    constructor(
        spec: AgentSpec,
        qwen: QwenClient,
        bus: AgentMessageBusService,
        private readonly toolsService: IncidentToolsService,
        correlationId: string,
        private readonly orchestratorId: string,
    ) {
        super(spec, qwen, bus, correlationId);
    }

    async investigate(task: string): Promise<void> {
        this.logger.log(`Investigating: ${task.slice(0, 100)}`);

        const toolExecutor: ToolExecutor = (name, args) => this.toolsService.execute(name, args);
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

    protected async handleMessage(msg: AgentMessage): Promise<void> {
        if (msg.type === 'task') {
            await this.investigate(msg.payload.task as string);
        }
    }
}