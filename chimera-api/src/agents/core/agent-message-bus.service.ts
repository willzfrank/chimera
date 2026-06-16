import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { AgentMessage, ChimeraEvent } from './types';

const GROUP = 'chimera-workers';
const BLOCK_MS = 100;
const PENDING_IDLE_THRESHOLD_MS = 5_000;
const MAX_PENDING_RETRIES = 3;
const DLQ_STREAM = 'chimera:dlq';
const EVENT_STREAM = 'chimera:events';

@Injectable()
export class AgentMessageBusService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AgentMessageBusService.name);

    private cmd: Redis;    // general commands
    private reader: Redis; // blocking reads (must not share with cmd)
    private pub: Redis;    // pub/sub for real-time frontend events

    private handlers = new Map<string, (msg: AgentMessage) => Promise<void>>();
    private pollers = new Map<string, boolean>();
    private eventListeners: ((e: ChimeraEvent) => void)[] = [];

    onModuleInit() {
        const opts = { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 };
        this.cmd = new Redis(opts);
        this.reader = new Redis(opts);
        this.pub = new Redis(opts);
        this.logger.log('AgentMessageBus connected');
    }

    // ── Registration ──────────────────────────────────────────────────────────

    async registerAgent(
        agentId: string,
        handler: (msg: AgentMessage) => Promise<void>,
    ): Promise<void> {
        const stream = this.streamKey(agentId);

        try {
            await this.cmd.xgroup('CREATE', stream, GROUP, '$', 'MKSTREAM');
        } catch (err: any) {
            if (!err.message.includes('BUSYGROUP')) throw err;
        }

        this.handlers.set(agentId, handler);
        this.pollers.set(agentId, true);
        this.poll(agentId).catch((e) => this.logger.error(`Poller crashed for ${agentId}`, e));
        this.logger.debug(`Agent ${agentId} registered on ${stream}`);
    }

    unregister(agentId: string): void {
        this.pollers.set(agentId, false);
        this.handlers.delete(agentId);
    }

    // ── Publishing ────────────────────────────────────────────────────────────

    async publish(
        toAgentId: string,
        message: Omit<AgentMessage, 'id' | 'timestamp'>,
    ): Promise<string> {
        const msg: AgentMessage = { ...message, id: uuidv4(), timestamp: Date.now() };
        const entryId = await this.cmd.xadd(
            this.streamKey(toAgentId),
            '*',
            'data',
            JSON.stringify(msg),
        );
        return entryId!;
    }

    async emitEvent(event: Omit<ChimeraEvent, 'timestamp'>): Promise<void> {
        const e: ChimeraEvent = { ...event, timestamp: Date.now() };

        // Persist in event stream for replay / frontend reconnect
        await this.cmd.xadd(EVENT_STREAM, '*', 'data', JSON.stringify(e));

        // Also pub/sub for low-latency WebSocket push
        await this.pub.publish('chimera:live', JSON.stringify(e));

        this.eventListeners.forEach((fn) => fn(e));
    }

    async getEventHistory(fromId = '0-0'): Promise<ChimeraEvent[]> {
        const entries = (await this.cmd.xrange(EVENT_STREAM, fromId, '+')) as [string, string[]][];
        return entries.map(([, fields]) => JSON.parse(fields[1]));
    }

    onEvent(fn: (e: ChimeraEvent) => void): void {
        this.eventListeners.push(fn);
    }

    // ── Polling loop (Redis Streams consumer group) ───────────────────────────

    private async poll(agentId: string): Promise<void> {
        const stream = this.streamKey(agentId);

        while (this.pollers.get(agentId)) {
            try {
                const raw = (await this.reader.xreadgroup(
                    'GROUP', GROUP, agentId,
                    'COUNT', '10',
                    'BLOCK', String(BLOCK_MS),
                    'STREAMS', stream, '>',
                )) as [string, [string, string[]][]][] | null;

                if (raw) {
                    for (const [, entries] of raw) {
                        await this.processEntries(agentId, stream, entries);
                    }
                }

                await this.retryPending(agentId, stream);
            } catch (err: any) {
                if (this.pollers.get(agentId)) {
                    this.logger.error(`Poll error for ${agentId}: ${err.message}`);
                    await this.sleep(1_000);
                }
            }
        }
    }

    private async processEntries(
        agentId: string,
        stream: string,
        entries: [string, string[]][],
    ): Promise<void> {
        const handler = this.handlers.get(agentId);
        if (!handler) return;

        for (const [entryId, fields] of entries) {
            try {
                const msg: AgentMessage = JSON.parse(fields[1]);
                await handler(msg);
                await this.cmd.xack(stream, GROUP, entryId);
            } catch (err: any) {
                this.logger.error(`Handler error [${agentId}] entry ${entryId}: ${err.message}`);
                // Don't ACK → stays pending for retry
            }
        }
    }

    private async retryPending(agentId: string, stream: string): Promise<void> {
        const handler = this.handlers.get(agentId);
        if (!handler) return;

        const pending = (await this.cmd.xpending(
            stream, GROUP, '-', '+', 5, agentId,
        )) as [string, string, number, number][];

        if (!pending?.length) return;

        const staleIds = pending
            .filter(([, , idleMs]) => idleMs > PENDING_IDLE_THRESHOLD_MS)
            .map(([id]) => id);

        if (!staleIds.length) return;

        const claimed = (await this.cmd.xclaim(
            stream, GROUP, agentId, PENDING_IDLE_THRESHOLD_MS, ...staleIds,
        )) as [string, string[]][];

        for (const [entryId, fields] of claimed) {
            const msg: AgentMessage = JSON.parse(fields[1]);
            const retries = msg.retryCount ?? 0;

            if (retries >= MAX_PENDING_RETRIES) {
                await this.dlq(stream, entryId, fields[1]);
                continue;
            }

            try {
                msg.retryCount = retries + 1;
                await handler(msg);
                await this.cmd.xack(stream, GROUP, entryId);
            } catch {
                await this.dlq(stream, entryId, fields[1]);
            }
        }
    }

    private async dlq(source: string, entryId: string, raw: string): Promise<void> {
        await this.cmd.xadd(DLQ_STREAM, '*', 'source', source, 'entryId', entryId, 'data', raw);
        await this.cmd.xdel(source, entryId);
        this.logger.warn(`Message ${entryId} from ${source} → DLQ`);

        await this.emitEvent({
            type: 'message_dead_lettered',
            payload: { source, entryId },
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private streamKey(agentId: string): string {
        return `chimera:agent:${agentId}`;
    }

    private sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    async onModuleDestroy(): Promise<void> {
        this.pollers.forEach((_, id) => this.pollers.set(id, false));
        await this.sleep(BLOCK_MS + 200); // let pollers exit
        await Promise.all([this.cmd.quit(), this.reader.quit(), this.pub.quit()]);
    }
}