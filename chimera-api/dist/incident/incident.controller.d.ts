import { CreateIncidentDto, IncidentService } from './incident.service';
import { IncidentQueue } from './incident.queue';
export declare class IncidentController {
    private readonly incidentService;
    private readonly queue;
    constructor(incidentService: IncidentService, queue: IncidentQueue);
    submit(dto: CreateIncidentDto): Promise<{
        status: string;
    }>;
    submitSync(dto: CreateIncidentDto): Promise<{
        status: string;
    }>;
    resolveCheckpoint(id: string, body: {
        approved: boolean;
    }): {
        status: string;
        id: string;
        approved: boolean;
    };
    health(): {
        status: string;
        service: string;
        timestamp: string;
        queue: {
            running: number;
            queued: number;
            maxConcurrent: number;
        };
        alibaba_cloud: boolean;
    };
}
