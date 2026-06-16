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
var RiskService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskService = void 0;
const common_1 = require("@nestjs/common");
const db_service_1 = require("../memory/db.service");
const agent_message_bus_service_1 = require("../agents/core/agent-message-bus.service");
let RiskService = RiskService_1 = class RiskService {
    db;
    bus;
    logger = new common_1.Logger(RiskService_1.name);
    constructor(db, bus) {
        this.db = db;
        this.bus = bus;
    }
    onModuleInit() {
        setInterval(() => this.computeAndEmit(), 5 * 60 * 1000);
    }
    async getRiskScores() {
        const { rows } = await this.db.pool.query(`
      SELECT
        incident_class,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS count_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')  AS count_7d,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')  AS count_1h,
        ROUND(AVG(confidence)::numeric, 2) AS avg_confidence
      FROM incidents
      WHERE incident_class IS NOT NULL
      GROUP BY incident_class
      HAVING COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') > 0
      ORDER BY count_24h DESC
    `);
        return rows.map(r => {
            const c24 = Number(r.count_24h);
            const c7d = Number(r.count_7d);
            const c1h = Number(r.count_1h);
            const dailyAvg = c7d / 7;
            const velocityTrend = c1h >= 2 ? 'spiking' : c24 > dailyAvg * 1.5 ? 'rising' : 'stable';
            const riskScore = Math.min(100, Math.round(c24 * 15 +
                (velocityTrend === 'spiking' ? 40 : velocityTrend === 'rising' ? 20 : 0) +
                (1 - Number(r.avg_confidence)) * 20));
            const riskLevel = riskScore >= 80 ? 'critical' :
                riskScore >= 60 ? 'high' :
                    riskScore >= 30 ? 'medium' : 'low';
            return {
                incidentClass: r.incident_class,
                count24h: c24,
                count7d: c7d,
                avgConfidence: Number(r.avg_confidence),
                velocityTrend,
                riskLevel,
                riskScore,
            };
        });
    }
    async computeAndEmit() {
        try {
            const scores = await this.getRiskScores();
            const critical = scores.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high');
            if (critical.length > 0) {
                await this.bus.emitEvent({
                    type: 'risk_score_updated',
                    payload: { scores, criticalCount: critical.length },
                });
                this.logger.warn(`Risk alert: ${critical.length} high/critical incident class(es)`);
            }
        }
        catch (err) {
            this.logger.warn(`Risk computation failed: ${err}`);
        }
    }
};
exports.RiskService = RiskService;
exports.RiskService = RiskService = RiskService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [db_service_1.DbService,
        agent_message_bus_service_1.AgentMessageBusService])
], RiskService);
//# sourceMappingURL=risk.service.js.map