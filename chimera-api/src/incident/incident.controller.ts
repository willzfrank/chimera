import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CreateIncidentDto, IncidentService } from './incident.service';

@Controller('incidents')
export class IncidentController {
    constructor(private readonly incidentService: IncidentService) { }

    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    async submit(@Body() dto: CreateIncidentDto) {
        this.incidentService.handleIncident(dto).catch(console.error);
        return { status: 'accepted' };
    }

    @Post('sync')
    async submitSync(@Body() dto: CreateIncidentDto) {
        const result = await this.incidentService.handleIncident(dto);
        return { status: 'resolved', result };
    }

    @Post('checkpoints/:id')
    resolveCheckpoint(@Param('id') id: string, @Body() body: { approved: boolean }) {
        this.incidentService.resolveCheckpoint(id, body.approved);
        return { status: 'ok', id, approved: body.approved };
    }

    @Get('health')
    health() {
        return {
            status: 'ok',
            service: 'chimera-api',
            timestamp: new Date().toISOString(),
            alibaba_cloud: true,
        };
    }
}