"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var IncidentQueue_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncidentQueue = void 0;
const common_1 = require("@nestjs/common");
let IncidentQueue = IncidentQueue_1 = class IncidentQueue {
    logger = new common_1.Logger(IncidentQueue_1.name);
    queue = [];
    running = 0;
    MAX_CONCURRENT = 3;
    enqueue(id, priority, fn) {
        this.queue.push({ id, fn, priority });
        this.queue.sort((a, b) => b.priority - a.priority);
        this.drain();
        this.logger.log(`Queued incident ${id} | queue size: ${this.queue.length} | running: ${this.running}`);
    }
    async drain() {
        while (this.running < this.MAX_CONCURRENT && this.queue.length > 0) {
            const item = this.queue.shift();
            this.running++;
            item.fn()
                .catch(err => this.logger.error(`Incident ${item.id} failed: ${err}`))
                .finally(() => { this.running--; this.drain(); });
        }
    }
    getStatus() {
        return { running: this.running, queued: this.queue.length, maxConcurrent: this.MAX_CONCURRENT };
    }
};
exports.IncidentQueue = IncidentQueue;
exports.IncidentQueue = IncidentQueue = IncidentQueue_1 = __decorate([
    (0, common_1.Injectable)()
], IncidentQueue);
//# sourceMappingURL=incident.queue.js.map