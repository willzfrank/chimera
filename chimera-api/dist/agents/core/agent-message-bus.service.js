"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AgentMessageBusService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMessageBusService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const GROUP = 'chimera-workers';
const BLOCK_MS = 100;
const PENDING_IDLE_THRESHOLD_MS = 5_000;
const MAX_PENDING_RETRIES = 3;
const DLQ_STREAM = 'chimera:dlq';
const EVENT_STREAM = 'chimera:events';
let AgentMessageBusService = AgentMessageBusService_1 = class AgentMessageBusService {
    logger = new common_1.Logger(AgentMessageBusService_1.name);
    cmd;
    reader;
    pub;
    handlers = new Map();
    pollers = new Map();
    eventListeners = [];
    onModuleInit() {
        const opts = { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 };
        this.cmd = new ioredis_1.default(opts);
        this.reader = new ioredis_1.default(opts);
        this.pub = new ioredis_1.default(opts);
        this.logger.log('AgentMessageBus connected');
    }
    async registerAgent(agentId, handler) {
        const stream = this.streamKey(agentId);
        try {
            await this.cmd.xgroup('CREATE', stream, GROUP, '$', 'MKSTREAM');
        }
        catch (err) {
            if (!err.message.includes('BUSYGROUP'))
                throw err;
        }
        this.handlers.set(agentId, handler);
        this.pollers.set(agentId, true);
        this.poll(agentId).catch((e) => this.logger.error(`Poller crashed for ${agentId}`, e));
        this.logger.debug(`Agent ${agentId} registered on ${stream}`);
    }
    unregister(agentId) {
        this.pollers.set(agentId, false);
        this.handlers.delete(agentId);
    }
    async publish(toAgentId, message) {
        const msg = { ...message, id: (0, uuid_1.v4)(), timestamp: Date.now() };
        const entryId = await this.cmd.xadd(this.streamKey(toAgentId), '*', 'data', JSON.stringify(msg));
        return entryId;
    }
    async emitEvent(event) {
        const e = { ...event, timestamp: Date.now() };
        await this.cmd.xadd(EVENT_STREAM, '*', 'data', JSON.stringify(e));
        await this.pub.publish('chimera:live', JSON.stringify(e));
        this.eventListeners.forEach((fn) => fn(e));
    }
    async getEventHistory(fromId = '0-0') {
        const entries = (await this.cmd.xrange(EVENT_STREAM, fromId, '+'));
        return entries.map(([, fields]) => JSON.parse(fields[1]));
    }
    onEvent(fn) {
        this.eventListeners.push(fn);
    }
    async poll(agentId) {
        const stream = this.streamKey(agentId);
        while (this.pollers.get(agentId)) {
            try {
                const raw = (await this.reader.xreadgroup('GROUP', GROUP, agentId, 'COUNT', '10', 'BLOCK', String(BLOCK_MS), 'STREAMS', stream, '>'));
                if (raw) {
                    for (const [, entries] of raw) {
                        await this.processEntries(agentId, stream, entries);
                    }
                }
                await this.retryPending(agentId, stream);
            }
            catch (err) {
                if (this.pollers.get(agentId)) {
                    this.logger.error(`Poll error for ${agentId}: ${err.message}`);
                    await this.sleep(1_000);
                }
            }
        }
    }
    async processEntries(agentId, stream, entries) {
        const handler = this.handlers.get(agentId);
        if (!handler)
            return;
        for (const [entryId, fields] of entries) {
            try {
                const msg = JSON.parse(fields[1]);
                await handler(msg);
                await this.cmd.xack(stream, GROUP, entryId);
            }
            catch (err) {
                this.logger.error(`Handler error [${agentId}] entry ${entryId}: ${err.message}`);
            }
        }
    }
    async retryPending(agentId, stream) {
        const handler = this.handlers.get(agentId);
        if (!handler)
            return;
        const pending = (await this.cmd.xpending(stream, GROUP, '-', '+', 5, agentId));
        if (!pending?.length)
            return;
        const staleIds = pending
            .filter(([, , idleMs]) => idleMs > PENDING_IDLE_THRESHOLD_MS)
            .map(([id]) => id);
        if (!staleIds.length)
            return;
        const claimed = (await this.cmd.xclaim(stream, GROUP, agentId, PENDING_IDLE_THRESHOLD_MS, ...staleIds));
        for (const [entryId, fields] of claimed) {
            const msg = JSON.parse(fields[1]);
            const retries = msg.retryCount ?? 0;
            if (retries >= MAX_PENDING_RETRIES) {
                await this.dlq(stream, entryId, fields[1]);
                continue;
            }
            try {
                msg.retryCount = retries + 1;
                await handler(msg);
                await this.cmd.xack(stream, GROUP, entryId);
            }
            catch {
                await this.dlq(stream, entryId, fields[1]);
            }
        }
    }
    async dlq(source, entryId, raw) {
        await this.cmd.xadd(DLQ_STREAM, '*', 'source', source, 'entryId', entryId, 'data', raw);
        await this.cmd.xdel(source, entryId);
        this.logger.warn(`Message ${entryId} from ${source} → DLQ`);
        await this.emitEvent({
            type: 'message_dead_lettered',
            payload: { source, entryId },
        });
    }
    streamKey(agentId) {
        return `chimera:agent:${agentId}`;
    }
    sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    async onModuleDestroy() {
        this.pollers.forEach((_, id) => this.pollers.set(id, false));
        await this.sleep(BLOCK_MS + 200);
        await Promise.all([this.cmd.quit(), this.reader.quit(), this.pub.quit()]);
    }
};
exports.AgentMessageBusService = AgentMessageBusService;
exports.AgentMessageBusService = AgentMessageBusService = AgentMessageBusService_1 = __decorate([
    (0, common_1.Injectable)()
], AgentMessageBusService);
//# sourceMappingURL=agent-message-bus.service.js.map