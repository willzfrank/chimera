import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateIncidentDto, IncidentService } from './incident.service';
import { IncidentQueue } from './incident.queue';

@ApiTags('incidents')
@Controller('incidents')
export class IncidentController {
    constructor(
        private readonly incidentService: IncidentService,
        private readonly queue: IncidentQueue,
    ) { }

    @ApiOperation({ summary: 'Submit incident for autonomous resolution' })
    @Post()
    @HttpCode(HttpStatus.ACCEPTED)
    async submit(@Body() dto: CreateIncidentDto) {
        this.incidentService.handleIncident(dto).catch(console.error);
        return { status: 'accepted' };
    }

    @ApiOperation({ summary: 'Submit incident (blocking — waits for resolution)' })
    @Post('sync')
    async submitSync(@Body() dto: CreateIncidentDto) {
        await this.incidentService.handleIncident(dto);
        return { status: 'queued' };
    }

    @ApiOperation({ summary: 'Resolve a human checkpoint' })
    @Post('checkpoints/:id')
    resolveCheckpoint(@Param('id') id: string, @Body() body: { approved: boolean }) {
        this.incidentService.resolveCheckpoint(id, body.approved);
        return { status: 'ok', id, approved: body.approved };
    }

    @ApiOperation({ summary: 'Health check for Alibaba Cloud deployment verification' })
    @Get('health')
    health() {
        return {
            status: 'ok',
            service: 'chimera-api',
            timestamp: new Date().toISOString(),
            queue: this.queue.getStatus(),
            alibaba_cloud: true,
        };
    }
}