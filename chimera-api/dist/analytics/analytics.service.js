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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const openai_1 = __importDefault(require("openai"));
const db_service_1 = require("../memory/db.service");
const ENGINEER_HOURLY_RATE = 150;
const AVG_MANUAL_RESOLUTION_MINS = 45;
let AnalyticsService = class AnalyticsService {
    db;
    openai = new openai_1.default({
        apiKey: process.env.QWEN_API_KEY,
        baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });
    constructor(db) {
        this.db = db;
    }
    async recordIncident(incident, result, incidentClass, fromMemory, agentsUsed, resolutionMs, tokensUsed) {
        await this.db.pool.query(`INSERT INTO incidents
         (id, title, severity, service, incident_class, from_memory, agents_used,
          confidence, resolution_ms, decision, dissents, tokens_used, resolved_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (id) DO UPDATE SET
         incident_class = EXCLUDED.incident_class,
         from_memory    = EXCLUDED.from_memory,
         agents_used    = EXCLUDED.agents_used,
         confidence     = EXCLUDED.confidence,
         resolution_ms  = EXCLUDED.resolution_ms,
         decision       = EXCLUDED.decision,
         dissents       = EXCLUDED.dissents,
         tokens_used    = EXCLUDED.tokens_used,
         resolved_at    = NOW()`, [
            incident.id, incident.title, incident.severity,
            incident.metadata?.service ?? 'unknown',
            incidentClass, fromMemory, agentsUsed,
            result.confidence, resolutionMs, result.decision,
            result.dissents.length, tokensUsed,
        ]);
    }
    async getSummary() {
        const [totals, classes, recent] = await Promise.all([
            this.db.pool.query(`
        SELECT
          COUNT(*)                                            AS total_incidents,
          ROUND(AVG(resolution_ms)::numeric, 0)              AS avg_resolution_ms,
          ROUND(AVG(confidence)::numeric, 3)                 AS avg_confidence,
          SUM(CASE WHEN from_memory THEN 1 ELSE 0 END)       AS memory_recalls,
          ROUND(AVG(CASE WHEN from_memory THEN resolution_ms END)::numeric, 0) AS avg_memory_ms,
          ROUND(AVG(CASE WHEN NOT from_memory THEN resolution_ms END)::numeric, 0) AS avg_synthesis_ms,
          SUM(tokens_used)                                   AS total_tokens,
          COUNT(*)::float * ${AVG_MANUAL_RESOLUTION_MINS} / 60.0 * ${ENGINEER_HOURLY_RATE} AS cost_saved_usd
        FROM incidents
        WHERE resolved_at IS NOT NULL
      `),
            this.db.pool.query(`
        SELECT incident_class, COUNT(*) AS count,
               ROUND(AVG(resolution_ms)::numeric, 0) AS avg_ms,
               ROUND(AVG(confidence)::numeric, 2)   AS avg_conf
        FROM incidents
        WHERE incident_class IS NOT NULL
        GROUP BY incident_class ORDER BY count DESC LIMIT 10
      `),
            this.db.pool.query(`
        SELECT id, title, severity, service, incident_class,
               confidence, resolution_ms, from_memory, agents_used, created_at
        FROM incidents
        ORDER BY created_at DESC LIMIT 20
      `),
        ]);
        return {
            summary: totals.rows[0],
            byClass: classes.rows,
            recent: recent.rows,
        };
    }
    async getPostmortem(incidentId) {
        const { rows } = await this.db.pool.query(`SELECT * FROM incidents WHERE id = $1`, [incidentId]);
        return rows[0] ?? null;
    }
    async generateExecutiveSummary(incidentId) {
        const data = await this.getPostmortem(incidentId);
        if (!data)
            return 'Incident not found.';
        try {
            const response = await this.openai.chat.completions.create({
                model: 'qwen-turbo',
                temperature: 0.3,
                messages: [
                    {
                        role: 'system',
                        content: `Write a 3-sentence executive summary for a non-technical C-suite audience.
Be specific about business impact, root cause, and resolution.
No technical jargon. Start with the business impact.`,
                    },
                    {
                        role: 'user',
                        content: `Incident: ${data.title}
Severity: ${data.severity} | Service: ${data.service}
Class: ${data.incident_class?.replace(/_/g, ' ')}
Resolution time: ${data.resolution_ms ? (data.resolution_ms / 1000).toFixed(1) + 's' : 'unknown'}
AI confidence: ${data.confidence ? (data.confidence * 100).toFixed(0) + '%' : 'unknown'}
Decision: ${data.decision ?? 'See full postmortem'}
Auto-detected: ${data.metadata?.autoDetected ? 'Yes (no human triggered alert)' : 'No'}`,
                    },
                ],
            });
            return response.choices[0].message.content ?? 'Summary unavailable.';
        }
        catch {
            return `${data.severity} incident on ${data.service} resolved in ${(data.resolution_ms / 1000).toFixed(1)}s with ${(data.confidence * 100).toFixed(0)}% confidence.`;
        }
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map