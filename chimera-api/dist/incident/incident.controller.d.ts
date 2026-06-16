import { CreateIncidentDto, IncidentService } from './incident.service';
export declare class IncidentController {
    private readonly incidentService;
    constructor(incidentService: IncidentService);
    submit(dto: CreateIncidentDto): Promise<{
        status: string;
    }>;
    submitSync(dto: CreateIncidentDto): Promise<{
        status: string;
        result: import("../agents/core/types").ConsensusResult;
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
        alibaba_cloud: boolean;
    };
}
