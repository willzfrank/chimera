import { DbService } from './db.service';
import { TopologySpec } from '../agents/core/types';
export declare class TopologyMemoryService {
    private readonly db;
    private readonly logger;
    private readonly openai;
    constructor(db: DbService);
    recall(description: string): Promise<TopologySpec | null>;
    store(description: string, topology: TopologySpec, confidence: number, resolutionMs: number): Promise<void>;
    private embed;
}
