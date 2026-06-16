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
var MetricWatcherService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricWatcherService = void 0;
const common_1 = require("@nestjs/common");
const incident_tools_service_1 = require("../tools/incident-tools.service");
const agent_message_bus_service_1 = require("../agents/core/agent-message-bus.service");
const RULES = [
    {
        metric: 'connections.avg',
        threshold: 90,
        comparator: 'gte',
        severity: 'P0',
        titleTemplate: 'Connection pool exhausted',
        descriptionTemplate: (v, s) => `${s} connection pool at ${v.toFixed(0)}% capacity. HikariCP reporting threads waiting. Health check returning 503. Pattern matches post-deployment regression.`,
    },
    {
        metric: 'error_rate.avg',
        threshold: 0.25,
        comparator: 'gte',
        severity: 'P1',
        titleTemplate: 'Error rate spike',
        descriptionTemplate: (v, s) => `${s} error rate climbed to ${(v * 100).toFixed(1)}% over 5 minutes. Primarily 5xx responses. CPU within normal range. No recent config changes detected.`,
    },
    {
        metric: 'latency_p99.avg',
        threshold: 5000,
        comparator: 'gte',
        severity: 'P1',
        titleTemplate: 'p99 latency spike',
        descriptionTemplate: (v, s) => `${s} p99 latency at ${v.toFixed(0)}ms, up from baseline of ~200ms. p50 unaffected, suggesting outlier requests. Possible lock contention or N+1 query.`,
    },
    {
        metric: 'cpu.max',
        threshold: 92,
        comparator: 'gte',
        severity: 'P1',
        titleTemplate: 'CPU saturation',
        descriptionTemplate: (v, s) => `${s} CPU peaked at ${v.toFixed(0)}%. Sustained for >3 minutes. GC overhead rising. Memory pressure likely secondary cause.`,
    },
];
const WATCHED_SERVICES = [
    { name: 'chimera-api', type: 'api' },
    { name: 'payment-service', type: 'payment' },
    { name: 'cache-layer', type: 'cache' },
    { name: 'auth-service', type: 'api' },
];
const WATCH_INTERVAL_MS = 30_000;
const COOLDOWN_MS = 4 * 60_000;
const STARTUP_DELAY_MS = 20_000;
let MetricWatcherService = MetricWatcherService_1 = class MetricWatcherService {
    tools;
    bus;
    logger = new common_1.Logger(MetricWatcherService_1.name);
    cooldowns = new Map();
    handleIncident;
    enabled = false;
    constructor(tools, bus) {
        this.tools = tools;
        this.bus = bus;
    }
    setIncidentHandler(fn) {
        this.handleIncident = fn;
    }
    toggle(on) {
        this.enabled = on;
        this.logger.log(`Metric watcher ${on ? 'ENABLED' : 'DISABLED'}`);
        this.bus.emitEvent({
            type: 'watcher_toggled',
            payload: { enabled: on },
        });
    }
    isEnabled() { return this.enabled; }
    onModuleInit() {
        setTimeout(() => {
            this.watch();
            setInterval(() => this.watch(), WATCH_INTERVAL_MS);
            this.logger.log(`Metric watcher active — polling ${WATCHED_SERVICES.length} services every ${WATCH_INTERVAL_MS / 1000}s`);
        }, STARTUP_DELAY_MS);
    }
    async watch() {
        if (!this.enabled)
            return;
        for (const service of WATCHED_SERVICES) {
            await this.checkService(service).catch(() => { });
        }
    }
    async checkService(service) {
        const metrics = await this.tools.execute('get_service_metrics', {
            service: service.name,
            metrics: ['cpu', 'memory', 'error_rate', 'latency_p99', 'connections'],
            windowMinutes: 5,
        });
        const flat = {};
        for (const [key, val] of Object.entries(metrics.metrics ?? {})) {
            flat[`${key}.avg`] = val.avg;
            flat[`${key}.max`] = val.max;
        }
        for (const rule of RULES) {
            const value = flat[rule.metric];
            if (value === undefined)
                continue;
            const breached = (rule.comparator === 'gt' && value > rule.threshold) ||
                (rule.comparator === 'gte' && value >= rule.threshold) ||
                (rule.comparator === 'lt' && value < rule.threshold);
            if (!breached)
                continue;
            const cooldownKey = `${service.name}:${rule.metric}`;
            const lastFired = this.cooldowns.get(cooldownKey) ?? 0;
            if (Date.now() - lastFired < COOLDOWN_MS)
                continue;
            this.cooldowns.set(cooldownKey, Date.now());
            const title = `${rule.titleTemplate} — ${service.name}`;
            this.logger.warn(`AUTO-DETECTED [${rule.severity}] ${title} (${rule.metric}=${value.toFixed(2)})`);
            await this.bus.emitEvent({
                type: 'auto_incident_detected',
                payload: { service: service.name, metric: rule.metric, value, severity: rule.severity, title },
            });
            if (this.handleIncident) {
                this.handleIncident({
                    title,
                    description: rule.descriptionTemplate(value, service.name),
                    severity: rule.severity,
                    service: service.name,
                    metadata: { source: 'MetricWatcher', metric: rule.metric, value, autoDetected: true },
                }).catch(err => this.logger.error(`Auto-incident failed: ${err}`));
            }
            break;
        }
    }
    getStatus() {
        return {
            watching: WATCHED_SERVICES.map(s => s.name),
            activeCooldowns: [...this.cooldowns.entries()]
                .filter(([, t]) => Date.now() - t < COOLDOWN_MS)
                .map(([k]) => k),
        };
    }
};
exports.MetricWatcherService = MetricWatcherService;
exports.MetricWatcherService = MetricWatcherService = MetricWatcherService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [incident_tools_service_1.IncidentToolsService,
        agent_message_bus_service_1.AgentMessageBusService])
], MetricWatcherService);
//# sourceMappingURL=metric-watcher.service.js.map