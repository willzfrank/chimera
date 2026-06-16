import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateIncidentDto, IncidentService } from './incident.service';

@Controller('incidents')
export class IncidentController {
    constructor(private readonly incidentService: IncidentService) { }

    // Async — result comes via WebSocket events
    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    async submit(@Body() dto: CreateIncidentDto) {
        this.incidentService.handleIncident(dto).catch(console.error);
        return { status: 'accepted', message: 'Subscribe to WebSocket /chimera:events for live updates' };
    }

    // Blocking — good for testing
    @Post('sync')
    async submitSync(@Body() dto: CreateIncidentDto) {
        const result = await this.incidentService.handleIncident(dto);
        return { status: 'resolved', result };
    }
}