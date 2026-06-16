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
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [incident_controller_1.IncidentController],
        providers: [
            qwen_client_1.QwenClient,
            agent_message_bus_service_1.AgentMessageBusService,
            incident_tools_service_1.IncidentToolsService,
            consensus_engine_1.ConsensusEngine,
            agent_factory_1.AgentFactory,
            incident_service_1.IncidentService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map