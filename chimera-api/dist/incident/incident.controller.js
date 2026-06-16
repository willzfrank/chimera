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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const incident_service_1 = require("./incident.service");
const incident_queue_1 = require("./incident.queue");
let IncidentController = class IncidentController {
    incidentService;
    queue;
    constructor(incidentService, queue) {
        this.incidentService = incidentService;
        this.queue = queue;
    }
    async submit(dto) {
        this.incidentService.handleIncident(dto).catch(console.error);
        return { status: 'accepted' };
    }
    async submitSync(dto) {
        await this.incidentService.handleIncident(dto);
        return { status: 'queued' };
    }
    resolveCheckpoint(id, body) {
        this.incidentService.resolveCheckpoint(id, body.approved);
        return { status: 'ok', id, approved: body.approved };
    }
    health() {
        return {
            status: 'ok',
            service: 'chimera-api',
            timestamp: new Date().toISOString(),
            queue: this.queue.getStatus(),
            alibaba_cloud: true,
        };
    }
};
exports.IncidentController = IncidentController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Submit incident for autonomous resolution' }),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incident_service_1.CreateIncidentDto]),
    __metadata("design:returntype", Promise)
], IncidentController.prototype, "submit", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Submit incident (blocking — waits for resolution)' }),
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incident_service_1.CreateIncidentDto]),
    __metadata("design:returntype", Promise)
], IncidentController.prototype, "submitSync", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Resolve a human checkpoint' }),
    (0, common_1.Post)('checkpoints/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IncidentController.prototype, "resolveCheckpoint", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Health check for Alibaba Cloud deployment verification' }),
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], IncidentController.prototype, "health", null);
exports.IncidentController = IncidentController = __decorate([
    (0, swagger_1.ApiTags)('incidents'),
    (0, common_1.Controller)('incidents'),
    __metadata("design:paramtypes", [incident_service_1.IncidentService,
        incident_queue_1.IncidentQueue])
], IncidentController);
//# sourceMappingURL=incident.controller.js.map