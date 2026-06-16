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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = void 0;
const common_1 = require("@nestjs/common");
const qwen_client_1 = require("../../qwen/qwen.client");
const agent_message_bus_service_1 = require("./agent-message-bus.service");
const incident_tools_service_1 = require("../../tools/incident-tools.service");
const topology_synthesizer_agent_1 = require("../topology/topology-synthesizer.agent");
const specialist_agent_1 = require("../specialists/specialist.agent");
const adversarial_agent_1 = require("../adversarial/adversarial.agent");
let AgentFactory = class AgentFactory {
    qwen;
    bus;
    tools;
    constructor(qwen, bus, tools) {
        this.qwen = qwen;
        this.bus = bus;
        this.tools = tools;
    }
    createTopologySynthesizer(correlationId) {
        return new topology_synthesizer_agent_1.TopologySynthesizerAgent(this.qwen, this.bus, correlationId);
    }
    createSpecialist(spec, correlationId, orchestratorId) {
        return new specialist_agent_1.SpecialistAgent(spec, this.qwen, this.bus, this.tools, correlationId, orchestratorId);
    }
    createAdversarial(spec, correlationId, targetAgentId, orchestratorId) {
        return new adversarial_agent_1.AdversarialAgent(spec, this.qwen, this.bus, correlationId, targetAgentId, orchestratorId);
    }
};
exports.AgentFactory = AgentFactory;
exports.AgentFactory = AgentFactory = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [qwen_client_1.QwenClient,
        agent_message_bus_service_1.AgentMessageBusService,
        incident_tools_service_1.IncidentToolsService])
], AgentFactory);
//# sourceMappingURL=agent-factory.js.map