import { CreateIncidentDto, IncidentService } from './incident.service';
export declare class IncidentController {
    private readonly incidentService;
    constructor(incidentService: IncidentService);
    submit(dto: CreateIncidentDto): Promise<{
        status: string;
        message: string;
    }>;
    submitSync(dto: CreateIncidentDto): Promise<{
        status: string;
        result: import("../agents/core/types").ConsensusResult;
    }>;
}
