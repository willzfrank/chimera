export declare class IncidentQueue {
    private readonly logger;
    private queue;
    private running;
    private readonly MAX_CONCURRENT;
    enqueue(id: string, priority: number, fn: () => Promise<void>): void;
    private drain;
    getStatus(): {
        running: number;
        queued: number;
        maxConcurrent: number;
    };
}
