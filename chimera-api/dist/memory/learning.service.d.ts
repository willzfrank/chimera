import { DbService } from './db.service';
export declare class LearningService {
    private readonly db;
    private readonly logger;
    private readonly openai;
    constructor(db: DbService);
    extractAndStore(incidentClass: string, incidentDescription: string, specialistFindings: string[], decision: string, confidence: number): Promise<void>;
    getPatterns(incidentClass: string, limit?: number): Promise<string[]>;
    getAllLearnings(): Promise<any[]>;
}
