"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const qwen_client_1 = require("./qwen/qwen.client");
const agent_message_bus_service_1 = require("./agents/core/agent-message-bus.service");
const consensus_engine_1 = require("./agents/core/consensus-engine");
const agent_factory_1 = require("./agents/core/agent-factory");
const incident_tools_service_1 = require("./tools/incident-tools.service");
const incident_service_1 = require("./incident/incident.service");
const incident_controller_1 = require("./incident/incident.controller");
const events_gateway_1 = require("./gateway/events.gateway");
const db_service_1 = require("./memory/db.service");
const topology_memory_service_1 = require("./memory/topology-memory.service");
const analytics_service_1 = require("./analytics/analytics.service");
const analytics_controller_1 = require("./analytics/analytics.controller");
const webhook_controller_1 = require("./webhooks/webhook.controller");
const slack_service_1 = require("./notifications/slack.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [incident_controller_1.IncidentController, analytics_controller_1.AnalyticsController, webhook_controller_1.WebhookController],
        providers: [
            qwen_client_1.QwenClient,
            db_service_1.DbService,
            agent_message_bus_service_1.AgentMessageBusService,
            incident_tools_service_1.IncidentToolsService,
            consensus_engine_1.ConsensusEngine,
            agent_factory_1.AgentFactory,
            topology_memory_service_1.TopologyMemoryService,
            analytics_service_1.AnalyticsService,
            slack_service_1.SlackService,
            events_gateway_1.EventsGateway,
            incident_service_1.IncidentService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map