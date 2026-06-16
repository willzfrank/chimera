import { MetricWatcherService } from './metric-watcher.service';
export declare class MonitoringController {
    private readonly watcher;
    constructor(watcher: MetricWatcherService);
    status(): {
        watching: string[];
        activeCooldowns: string[];
        autoDetection: boolean;
    };
    toggle(body: {
        enabled: boolean;
    }): {
        autoDetection: boolean;
    };
}
