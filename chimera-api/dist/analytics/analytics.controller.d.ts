import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
    getSummary(): Promise<{
        summary: any;
        byClass: any[];
        recent: any[];
    }>;
    getPostmortem(id: string, res: Response): Promise<Response<any, Record<string, any>>>;
}
