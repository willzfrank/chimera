import { Body, Controller, HttpCode, HttpStatus, Post, Headers } from '@nestjs/common';
import { IncidentService } from '../incident/incident.service';

interface PagerDutyPayload {
    messages: Array<{
        event: string;
        incident: {
            id: string;
            title: string;
            urgency: 'high' | 'low';
            body?: { details?: string };
            service?: { name?: string };
        };
    }>;
}

@Controller('webhooks')
export class WebhookController {
    constructor(private readonly incidentService: IncidentService) { }

    // PagerDuty
    @Post('pagerduty')
    @HttpCode(HttpStatus.OK)
    async pagerduty(@Body() body: PagerDutyPayload) {
        for (const msg of body.messages ?? []) {
            if (msg.event !== 'incident.trigger') continue;
            const inc = msg.incident;
            this.incidentService.handleIncident({
                title: inc.title,
                description: inc.body?.details ?? inc.title,
                severity: inc.urgency === 'high' ? 'P0' : 'P1',
                service: inc.service?.name ?? 'unknown',
                metadata: { source: 'pagerduty', externalId: inc.id },
            }).catch(console.error);
        }
        return { status: 'accepted' };
    }

    // Generic — for any monitoring system
    @Post('generic')
    @HttpCode(HttpStatus.ACCEPTED)
    async generic(@Body() body: {
        title: string;
        description?: string;
        severity?: 'P0' | 'P1' | 'P2' | 'P3';
        service?: string;
    }) {
        this.incidentService.handleIncident({
            title: body.title,
            description: body.description ?? body.title,
            severity: body.severity ?? 'P1',
            service: body.service ?? 'unknown',
        }).catch(console.error);
        return { status: 'accepted' };
    }
}