import { Injectable, Logger } from '@nestjs/common';

interface QueuedIncident {
    id: string;
    fn: () => Promise<void>;
    priority: number; // P0=4, P1=3, P2=2, P3=1
}

@Injectable()
export class IncidentQueue {
    private readonly logger = new Logger(IncidentQueue.name);
    private queue: QueuedIncident[] = [];
    private running = 0;
    private readonly MAX_CONCURRENT = 3; // 3 simultaneous investigations

    enqueue(id: string, priority: number, fn: () => Promise<void>): void {
        this.queue.push({ id, fn, priority });
        this.queue.sort((a, b) => b.priority - a.priority); // P0 first
        this.drain();
        this.logger.log(`Queued incident ${id} | queue size: ${this.queue.length} | running: ${this.running}`);
    }

    private async drain(): Promise<void> {
        while (this.running < this.MAX_CONCURRENT && this.queue.length > 0) {
            const item = this.queue.shift()!;
            this.running++;
            item.fn()
                .catch(err => this.logger.error(`Incident ${item.id} failed: ${err}`))
                .finally(() => { this.running--; this.drain(); });
        }
    }

    getStatus() {
        return { running: this.running, queued: this.queue.length, maxConcurrent: this.MAX_CONCURRENT };
    }
}