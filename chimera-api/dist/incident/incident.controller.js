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
const incident_service_1 = require("./incident.service");
let IncidentController = class IncidentController {
    incidentService;
    constructor(incidentService) {
        this.incidentService = incidentService;
    }
    async submit(dto) {
        this.incidentService.handleIncident(dto).catch(console.error);
        return { status: 'accepted', message: 'Subscribe to WebSocket /chimera:events for live updates' };
    }
    async submitSync(dto) {
        const result = await this.incidentService.handleIncident(dto);
        return { status: 'resolved', result };
    }
};
exports.IncidentController = IncidentController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incident_service_1.CreateIncidentDto]),
    __metadata("design:returntype", Promise)
], IncidentController.prototype, "submit", null);
__decorate([
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [incident_service_1.CreateIncidentDto]),
    __metadata("design:returntype", Promise)
], IncidentController.prototype, "submitSync", null);
exports.IncidentController = IncidentController = __decorate([
    (0, common_1.Controller)('incidents'),
    __metadata("design:paramtypes", [incident_service_1.IncidentService])
], IncidentController);
//# sourceMappingURL=incident.controller.js.map