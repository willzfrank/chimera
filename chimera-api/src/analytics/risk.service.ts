import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DbService } from '../memory/db.service';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';

export interface RiskScore {
    incidentClass: string;
    count24h: number;
    count7d: number;
    avgConfidence: number;
    velocityTrend: 'stable' | 'rising' | 'spiking';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number; // 0-100
}

@Injectable()
export class RiskService implements OnModuleInit {
    private readonly logger = new Logger(RiskService.name);

    constructor(
        private readonly db: DbService,
        private readonly bus: AgentMessageBusService,
    ) { }

    onModuleInit() {
        // Compute risk every 5 minutes
        setInterval(() => this.computeAndEmit(), 5 * 60 * 1000);
    }

    async getRiskScores(): Promise<RiskScore[]> {
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

            const velocityTrend: RiskScore['velocityTrend'] =
                c1h >= 2 ? 'spiking' : c24 > dailyAvg * 1.5 ? 'rising' : 'stable';

            const riskScore = Math.min(100, Math.round(
                c24 * 15 +
                (velocityTrend === 'spiking' ? 40 : velocityTrend === 'rising' ? 20 : 0) +
                (1 - Number(r.avg_confidence)) * 20,
            ));

            const riskLevel: RiskScore['riskLevel'] =
                riskScore >= 80 ? 'critical' :
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

    private async computeAndEmit() {
        try {
            const scores = await this.getRiskScores();
            const critical = scores.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high');

            if (critical.length > 0) {
                await this.bus.emitEvent({
                    type: 'risk_score_updated' as any,
                    payload: { scores, criticalCount: critical.length },
                });
                this.logger.warn(`Risk alert: ${critical.length} high/critical incident class(es)`);
            }
        } catch (err) {
            this.logger.warn(`Risk computation failed: ${err}`);
        }
    }
}