import { OnModuleInit } from '@nestjs/common';
import { DbService } from '../memory/db.service';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
export interface RiskScore {
    incidentClass: string;
    count24h: number;
    count7d: number;
    avgConfidence: number;
    velocityTrend: 'stable' | 'rising' | 'spiking';
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
}
export declare class RiskService implements OnModuleInit {
    private readonly db;
    private readonly bus;
    private readonly logger;
    constructor(db: DbService, bus: AgentMessageBusService);
    onModuleInit(): void;
    getRiskScores(): Promise<RiskScore[]>;
    private computeAndEmit;
}
