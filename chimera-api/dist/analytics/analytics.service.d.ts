import { DbService } from '../memory/db.service';
import { Incident, ConsensusResult } from '../agents/core/types';
export declare class AnalyticsService {
    private readonly db;
    constructor(db: DbService);
    recordIncident(incident: Incident, result: ConsensusResult, incidentClass: string, fromMemory: boolean, agentsUsed: number, resolutionMs: number, tokensUsed: number): Promise<void>;
    getSummary(): Promise<{
        summary: any;
        byClass: any[];
        recent: any[];
    }>;
    getPostmortem(incidentId: string): Promise<any>;
}
