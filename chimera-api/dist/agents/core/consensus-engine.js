"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ConsensusEngine_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsensusEngine = void 0;
const common_1 = require("@nestjs/common");
const qwen_client_1 = require("../../qwen/qwen.client");
const HUMAN_THRESHOLD = 0.65;
const ADVERSARIAL_CONFIDENCE_CUTOFF = 0.60;
let ConsensusEngine = ConsensusEngine_1 = class ConsensusEngine {
    qwen;
    logger = new common_1.Logger(ConsensusEngine_1.name);
    constructor(qwen) {
        this.qwen = qwen;
    }
    async reach(incident, specialistResults, adversarialResults) {
        this.logger.log(`Reaching consensus: ${specialistResults.length} specialist(s), ${adversarialResults.length} adversarial(s)`);
        const dissents = adversarialResults
            .filter((r) => r.confidence >= ADVERSARIAL_CONFIDENCE_CUTOFF)
            .map((r) => ({ agentId: r.agentId, reason: r.content.slice(0, 300) }));
        const avgSpecialistConf = specialistResults.reduce((s, r) => s + r.confidence, 0) / (specialistResults.length || 1);
        const requiresHuman = (dissents.length > 0 && avgSpecialistConf < HUMAN_THRESHOLD) || avgSpecialistConf < 0.5;
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
        let parsed;
        try {
            parsed = JSON.parse(synthesis.content.replace(/```json|```/g, '').trim());
        }
        catch {
            this.logger.warn('Consensus JSON parse failed — fallback to raw');
            parsed = { agreed: dissents.length === 0, decision: synthesis.content, confidence: avgSpecialistConf };
        }
        const result = {
            agreed: parsed.agreed ?? dissents.length === 0,
            decision: parsed.decision,
            confidence: parsed.confidence ?? avgSpecialistConf,
            dissents,
            requiresHumanCheckpoint: requiresHuman || (parsed.confidence ?? 1) < HUMAN_THRESHOLD,
        };
        this.logger.log(`Consensus: agreed=${result.agreed} confidence=${result.confidence.toFixed(2)} humanNeeded=${result.requiresHumanCheckpoint}`);
        return result;
    }
};
exports.ConsensusEngine = ConsensusEngine;
exports.ConsensusEngine = ConsensusEngine = ConsensusEngine_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [qwen_client_1.QwenClient])
], ConsensusEngine);
//# sourceMappingURL=consensus-engine.js.map