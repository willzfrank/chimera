import { Injectable, Logger } from '@nestjs/common';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentResponse, ConsensusResult, Incident } from './types';

const HUMAN_THRESHOLD = 0.65;
const ADVERSARIAL_CONFIDENCE_CUTOFF = 0.60;

@Injectable()
export class ConsensusEngine {
    private readonly logger = new Logger(ConsensusEngine.name);

    constructor(private readonly qwen: QwenClient) { }

    async reach(
        incident: Incident,
        specialistResults: AgentResponse[],
        adversarialResults: AgentResponse[],
    ): Promise<ConsensusResult> {
        this.logger.log(
            `Reaching consensus: ${specialistResults.length} specialist(s), ${adversarialResults.length} adversarial(s)`,
        );

        const dissents = adversarialResults
            .filter((r) => r.confidence >= ADVERSARIAL_CONFIDENCE_CUTOFF)
            .map((r) => ({ agentId: r.agentId, reason: r.content.slice(0, 300) }));

        const avgSpecialistConf =
            specialistResults.reduce((s, r) => s + r.confidence, 0) / (specialistResults.length || 1);

        const requiresHuman =
            (dissents.length > 0 && avgSpecialistConf < HUMAN_THRESHOLD) || avgSpecialistConf < 0.5;

        const synthesis = await this.qwen.complete({
            model: 'qwen-max',
            systemPrompt: `You are CHIMERA's consensus synthesizer. Analyze specialist diagnoses and adversarial challenges to produce a definitive incident resolution.

Respond ONLY with valid JSON (no markdown fences):
{
  "agreed": boolean,
  "agreedDiagnosis": "root cause in one sentence",
  "decision": "specific, actionable resolution",
  "proposedActions": ["ordered action list"],
  "confidence": 0.0-1.0,
  "keyRisks": ["risks of proceeding"]
}`,
            messages: [
                {
                    role: 'user',
                    content: `INCIDENT:\n${JSON.stringify(incident, null, 2)}

SPECIALIST ANALYSES:
${specialistResults.map((r, i) => `[Specialist ${i + 1} | confidence=${r.confidence.toFixed(2)}]\n${r.content}`).join('\n\n---\n\n')}

ADVERSARIAL CHALLENGES:
${adversarialResults.map((r, i) => `[Adversarial ${i + 1} | confidence=${r.confidence.toFixed(2)}]\n${r.content}`).join('\n\n---\n\n')}

${dissents.length ? `⚠️ ${dissents.length} adversarial challenge(s) exceeded confidence threshold — weigh carefully.` : 'No strong adversarial challenges.'}`,
                },
            ],
        });

        let parsed: any;
        try {
            parsed = JSON.parse(synthesis.content.replace(/```json|```/g, '').trim());
        } catch {
            this.logger.warn('Consensus JSON parse failed — fallback to raw');
            parsed = { agreed: dissents.length === 0, decision: synthesis.content, confidence: avgSpecialistConf };
        }

        const result: ConsensusResult = {
            agreed: parsed.agreed ?? dissents.length === 0,
            decision: parsed.decision,
            confidence: parsed.confidence ?? avgSpecialistConf,
            dissents,
            requiresHumanCheckpoint: requiresHuman || (parsed.confidence ?? 1) < HUMAN_THRESHOLD,
        };

        this.logger.log(
            `Consensus: agreed=${result.agreed} confidence=${result.confidence.toFixed(2)} humanNeeded=${result.requiresHumanCheckpoint}`,
        );

        return result;
    }
}