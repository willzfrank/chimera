import { BaseAgent } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { AgentMessage, AgentSpec } from '../core/types';

const ADVERSARIAL_SUFFIX = `

You are an adversarial validator. Your ONLY job: challenge the specialist's analysis ruthlessly.

Rules:
- Find logical gaps, missing evidence, alternative explanations
- If the specialist is wrong, say so with specific supporting evidence
- If their conclusion is correct but incomplete, say what's missing
- Rate confidence in your challenge (0–1); don't bluff
- Be evidence-based, not contrarian for its own sake

Structure your response:
1. What the specialist got right (brief)
2. What's wrong, weak, or missing (detailed)
3. Your alternative hypothesis if you have one
4. Confidence in this challenge: 0.0–1.0`;

export class AdversarialAgent extends BaseAgent {
    constructor(
        spec: AgentSpec,
        qwen: QwenClient,
        bus: AgentMessageBusService,
        correlationId: string,
        private readonly targetAgentId: string,
        private readonly orchestratorId: string,
    ) {
        super(
            { ...spec, systemPrompt: spec.systemPrompt + ADVERSARIAL_SUFFIX },
            qwen,
            bus,
            correlationId,
        );
    }

    async challenge(specialistAnalysis: string, originalTask: string): Promise<void> {
        this.logger.log(`Challenging agent ${this.targetAgentId}`);

        const response = await this.think(
            `ORIGINAL INVESTIGATION TASK:\n${originalTask}\n\nSPECIALIST'S ANALYSIS:\n${specialistAnalysis}\n\nChallenge this analysis rigorously.`,
        );

        await this.sendTo(this.orchestratorId, 'challenge', {
            type: 'adversarial_challenge',
            agentId: this.agentId,
            agentName: this.name,
            content: response.content,
            confidence: response.confidence,
            targetAgentId: this.targetAgentId,
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

        this.logger.log(`Challenge done — confidence=${response.confidence.toFixed(2)}`);
    }

    protected async handleMessage(msg: AgentMessage): Promise<void> {
        if (msg.type === 'task') {
            const { specialistAnalysis, originalTask } = msg.payload as {
                specialistAnalysis: string;
                originalTask: string;
            };
            await this.challenge(specialistAnalysis, originalTask);
        }
    }
}