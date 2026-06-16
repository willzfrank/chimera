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
const incident_queue_1 = require("./incident/incident.queue");
const incident_controller_1 = require("./incident/incident.controller");
const events_gateway_1 = require("./gateway/events.gateway");
const db_service_1 = require("./memory/db.service");
const topology_memory_service_1 = require("./memory/topology-memory.service");
const learning_service_1 = require("./memory/learning.service");
const analytics_service_1 = require("./analytics/analytics.service");
const risk_service_1 = require("./analytics/risk.service");
const analytics_controller_1 = require("./analytics/analytics.controller");
const webhook_controller_1 = require("./webhooks/webhook.controller");
const slack_service_1 = require("./notifications/slack.service");
const metric_watcher_service_1 = require("./monitoring/metric-watcher.service");
const monitoring_controller_1 = require("./monitoring/monitoring.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [incident_controller_1.IncidentController, analytics_controller_1.AnalyticsController, webhook_controller_1.WebhookController, monitoring_controller_1.MonitoringController],
        providers: [
            qwen_client_1.QwenClient,
            db_service_1.DbService,
            agent_message_bus_service_1.AgentMessageBusService,
            incident_tools_service_1.IncidentToolsService,
            consensus_engine_1.ConsensusEngine,
            agent_factory_1.AgentFactory,
            topology_memory_service_1.TopologyMemoryService,
            learning_service_1.LearningService,
            analytics_service_1.AnalyticsService,
            risk_service_1.RiskService,
            slack_service_1.SlackService,
            events_gateway_1.EventsGateway,
            incident_queue_1.IncidentQueue,
            incident_service_1.IncidentService,
            metric_watcher_service_1.MetricWatcherService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map