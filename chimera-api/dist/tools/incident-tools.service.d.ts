import { AgentTool } from '../agents/core/types';
import { DbService } from '../memory/db.service';
export declare const ALL_TOOLS: Record<string, AgentTool>;
export declare class IncidentToolsService {
    private readonly db;
    constructor(db: DbService);
    getByNames(names: string[]): AgentTool[];
    execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
    private mockLogs;
    private mockMetrics;
    private mockDeployments;
    private queryDb;
    private checkHealth;
    private mockRunbooks;
    private mockDeps;
}
