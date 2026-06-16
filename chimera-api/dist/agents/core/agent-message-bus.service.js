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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentMessageBusService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
let AgentMessageBusService = class AgentMessageBusService {
    publisher;
    subscriber;
    handlers = new Map();
    eventHandlers = [];
    onModuleInit() {
        const opts = { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 };
        this.publisher = new ioredis_1.default(opts);
        this.subscriber = new ioredis_1.default(opts);
        this.subscriber.psubscribe('chimera:agent:*:inbox', (err) => {
            if (err)
                throw err;
        });
        this.subscriber.on('pmessage', async (_pattern, channel, raw) => {
            const agentId = channel.split(':')[2];
            const handler = this.handlers.get(agentId);
            if (handler) {
                const msg = JSON.parse(raw);
                await handler(msg);
            }
        });
    }
    async publish(toAgentId, message) {
        const msg = {
            ...message,
            id: (0, uuid_1.v4)(),
            timestamp: Date.now(),
        };
        await this.publisher.publish(`chimera:agent:${toAgentId}:inbox`, JSON.stringify(msg));
    }
    async emitEvent(event) {
        const e = { ...event, timestamp: Date.now() };
        await this.publisher.publish('chimera:events', JSON.stringify(e));
        this.eventHandlers.forEach((h) => h(e));
    }
    subscribe(agentId, handler) {
        this.handlers.set(agentId, handler);
    }
    unsubscribe(agentId) {
        this.handlers.delete(agentId);
    }
    onEvent(handler) {
        this.eventHandlers.push(handler);
    }
    async onModuleDestroy() {
        await this.publisher.quit();
        await this.subscriber.quit();
    }
};
exports.AgentMessageBusService = AgentMessageBusService;
exports.AgentMessageBusService = AgentMessageBusService = __decorate([
    (0, common_1.Injectable)()
], AgentMessageBusService);
//# sourceMappingURL=agent-message-bus.service.js.map