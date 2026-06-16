"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var IncidentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentService = exports.CreateIncidentDto = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const qwen_client_1 = require("../qwen/qwen.client");
const agent_message_bus_service_1 = require("../agents/core/agent-message-bus.service");
const agent_factory_1 = require("../agents/core/agent-factory");
const consensus_engine_1 = require("../agents/core/consensus-engine");
const topology_memory_service_1 = require("../memory/topology-memory.service");
const meta_orchestrator_agent_1 = require("../agents/orchestrator/meta-orchestrator.agent");
const analytics_service_1 = require("../analytics/analytics.service");
const slack_service_1 = require("../notifications/slack.service");
class CreateIncidentDto {
    title;
    description;
    severity;
    service;
    metadata;
}
exports.CreateIncidentDto = CreateIncidentDto;
let IncidentService = IncidentService_1 = class IncidentService {
    qwen;
    bus;
    factory;
    consensus;
    memory;
    analytics;
    slack;
    logger = new common_1.Logger(IncidentService_1.name);
    checkpoints = new Map();
    constructor(qwen, bus, factory, consensus, memory, analytics, slack) {
        this.qwen = qwen;
        this.bus = bus;
        this.factory = factory;
        this.consensus = consensus;
        this.memory = memory;
        this.analytics = analytics;
        this.slack = slack;
    }
    resolveCheckpoint(id, approved) {
        const fn = this.checkpoints.get(id);
        if (fn) {
            fn(approved);
            this.checkpoints.delete(id);
        }
    }
    async waitForCheckpoint(id, timeoutMs = 120_000) {
        return new Promise((resolve) => {
            this.checkpoints.set(id, resolve);
            setTimeout(() => {
                if (this.checkpoints.has(id)) {
                    this.checkpoints.delete(id);
                    this.logger.warn(`Checkpoint ${id} timed out — auto-approving`);
                    resolve(true);
                }
            }, timeoutMs);
        });
    }
    async handleIncident(dto) {
        const incident = {
            id: (0, uuid_1.v4)(),
            title: dto.title,
            description: dto.description,
            severity: dto.severity,
            metadata: { service: dto.service, ...dto.metadata },
            timestamp: Date.now(),
        };
        this.logger.log(`Incident: [${incident.severity}] ${incident.title}`);
        const orchestrator = new meta_orchestrator_agent_1.MetaOrchestratorAgent(this.qwen, this.bus, this.factory, this.consensus, this.memory, this.analytics, this.slack);
        return orchestrator.processIncident(incident);
    }
};
exports.IncidentService = IncidentService;
exports.IncidentService = IncidentService = IncidentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [qwen_client_1.QwenClient,
        agent_message_bus_service_1.AgentMessageBusService,
        agent_factory_1.AgentFactory,
        consensus_engine_1.ConsensusEngine,
        topology_memory_service_1.TopologyMemoryService,
        analytics_service_1.AnalyticsService,
        slack_service_1.SlackService])
], IncidentService);
//# sourceMappingURL=incident.service.js.map