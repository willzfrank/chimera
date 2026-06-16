import { OnModuleInit } from '@nestjs/common';
import { IncidentToolsService } from '../tools/incident-tools.service';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
export declare class MetricWatcherService implements OnModuleInit {
    private readonly tools;
    private readonly bus;
    private readonly logger;
    private readonly cooldowns;
    private handleIncident;
    private enabled;
    constructor(tools: IncidentToolsService, bus: AgentMessageBusService);
    setIncidentHandler(fn: (dto: any) => Promise<void>): void;
    toggle(on: boolean): void;
    isEnabled(): boolean;
    onModuleInit(): void;
    private watch;
    private checkService;
    getStatus(): {
        watching: string[];
        activeCooldowns: string[];
    };
}
