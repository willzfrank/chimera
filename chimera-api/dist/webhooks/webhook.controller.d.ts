import { IncidentService } from '../incident/incident.service';
interface PagerDutyPayload {
    messages: Array<{
        event: string;
        incident: {
            id: string;
            title: string;
            urgency: 'high' | 'low';
            body?: {
                details?: string;
            };
            service?: {
                name?: string;
            };
        };
    }>;
}
export declare class WebhookController {
    private readonly incidentService;
    constructor(incidentService: IncidentService);
    pagerduty(body: PagerDutyPayload): Promise<{
        status: string;
    }>;
    generic(body: {
        title: string;
        description?: string;
        severity?: 'P0' | 'P1' | 'P2' | 'P3';
        service?: string;
    }): Promise<{
        status: string;
    }>;
}
export {};
