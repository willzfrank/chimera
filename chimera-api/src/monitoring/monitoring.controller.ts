import { Body, Controller, Get, Post } from '@nestjs/common';
import { MetricWatcherService } from './metric-watcher.service';

@Controller('monitoring')
export class MonitoringController {
    constructor(private readonly watcher: MetricWatcherService) { }

    @Get('status')
    status() {
        return {
            autoDetection: this.watcher.isEnabled(),
            ...this.watcher.getStatus(),
        };
    }

    @Post('toggle')
    toggle(@Body() body: { enabled: boolean }) {
        this.watcher.toggle(body.enabled);
        return { autoDetection: body.enabled };
    }
}