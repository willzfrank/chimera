import { AgentTool } from '../agents/core/types';
export declare const ALL_TOOLS: Record<string, AgentTool>;
export declare class IncidentToolsService {
    getByNames(names: string[]): AgentTool[];
    execute(toolName: string, args: Record<string, unknown>): Promise<unknown>;
    private mockLogs;
    private mockMetrics;
    private mockDeployments;
    private mockDbQuery;
    private mockHealth;
    private mockRunbooks;
    private mockDeps;
}
