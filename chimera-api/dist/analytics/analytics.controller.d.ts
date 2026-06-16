import type { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { LearningService } from '../memory/learning.service';
import { RiskService } from './risk.service';
export declare class AnalyticsController {
    private readonly analytics;
    private readonly learning;
    private readonly risk;
    constructor(analytics: AnalyticsService, learning: LearningService, risk: RiskService);
    getSummary(): Promise<{
        summary: any;
        byClass: any[];
        recent: any[];
    }>;
    getExecutiveSummary(id: string): Promise<{
        incidentId: string;
        summary: string;
    }>;
    getLearnings(): Promise<any[]>;
    getRisk(): Promise<import("./risk.service").RiskScore[]>;
    getPostmortem(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
