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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var LearningService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
const db_service_1 = require("./db.service");
let LearningService = LearningService_1 = class LearningService {
    db;
    logger = new common_1.Logger(LearningService_1.name);
    openai;
    constructor(db) {
        this.db = db;
        this.openai = new openai_1.default({
            apiKey: process.env.QWEN_API_KEY,
            baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        });
    }
    async extractAndStore(incidentClass, incidentDescription, specialistFindings, decision, confidence) {
        if (confidence < 0.75)
            return;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'qwen-plus',
                temperature: 0.2,
                messages: [
                    {
                        role: 'system',
                        content: `You are a systems reliability expert extracting reusable diagnostic patterns from resolved incidents.
Extract 3-5 concise, generalizable patterns that would help future agents diagnose similar incidents faster.
Each pattern must be a single sentence starting with a signal word ("High", "When", "If", "Presence of").
Respond ONLY with a JSON array of strings. No markdown, no preamble.`,
                    },
                    {
                        role: 'user',
                        content: `INCIDENT CLASS: ${incidentClass}
INCIDENT: ${incidentDescription}

SPECIALIST FINDINGS:
${specialistFindings.map((f, i) => `[${i + 1}] ${f.slice(0, 400)}`).join('\n')}

RESOLUTION: ${decision}

Extract the diagnostic patterns.`,
                    },
                ],
            });
            let patterns = [];
            try {
                patterns = JSON.parse(response.choices[0].message.content?.replace(/```json|```/g, '').trim() ?? '[]');
            }
            catch {
                this.logger.warn('Learning extraction parse failed');
                return;
            }
            for (const pattern of patterns.filter(p => typeof p === 'string' && p.length > 10)) {
                await this.db.pool.query(`INSERT INTO agent_learnings (incident_class, pattern, evidence, confidence)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (incident_class, pattern)
           DO UPDATE SET usage_count = agent_learnings.usage_count + 1,
                         confidence  = (agent_learnings.confidence + EXCLUDED.confidence) / 2`, [incidentClass, pattern.slice(0, 500), decision.slice(0, 200), confidence]);
            }
            this.logger.log(`Extracted ${patterns.length} patterns for class: ${incidentClass}`);
        }
        catch (err) {
            this.logger.warn(`Learning extraction failed (non-fatal): ${err}`);
        }
    }
    async getPatterns(incidentClass, limit = 5) {
        try {
            const { rows } = await this.db.pool.query(`SELECT pattern FROM agent_learnings
         WHERE incident_class = $1
         ORDER BY confidence DESC, usage_count DESC
         LIMIT $2`, [incidentClass, limit]);
            return rows.map(r => r.pattern);
        }
        catch {
            return [];
        }
    }
    async getAllLearnings() {
        const { rows } = await this.db.pool.query(`SELECT incident_class, pattern, confidence, usage_count, created_at
       FROM agent_learnings
       ORDER BY incident_class, confidence DESC`);
        return rows;
    }
};
exports.LearningService = LearningService;
exports.LearningService = LearningService = LearningService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], LearningService);
//# sourceMappingURL=learning.service.js.map