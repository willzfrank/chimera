import { Injectable } from '@nestjs/common';
import { AgentTool } from '../agents/core/types';
import { DbService } from '../memory/db.service';

export const ALL_TOOLS: Record<string, AgentTool> = {
    query_logs: {
        name: 'query_logs',
        description: 'Search application logs by service, severity, and time window',
        parameters: {
            type: 'object',
            properties: {
                service: { type: 'string' },
                severity: { type: 'string', enum: ['ERROR', 'WARN', 'INFO', 'DEBUG'] },
                startTime: { type: 'string', description: 'ISO 8601' },
                endTime: { type: 'string', description: 'ISO 8601' },
                query: { type: 'string' },
                limit: { type: 'number', default: 50 },
            },
            required: ['service', 'startTime', 'endTime'],
        },
    },
    get_service_metrics: {
        name: 'get_service_metrics',
        description: 'Get CPU, memory, latency (p50/p95/p99), error rate, RPS, connection count for a service',
        parameters: {
            type: 'object',
            properties: {
                service: { type: 'string' },
                metrics: {
                    type: 'array',
                    items: { type: 'string', enum: ['cpu', 'memory', 'latency_p50', 'latency_p95', 'latency_p99', 'error_rate', 'rps', 'connections'] },
                },
                windowMinutes: { type: 'number', default: 30 },
            },
            required: ['service', 'metrics'],
        },
    },
    check_recent_deployments: {
        name: 'check_recent_deployments',
        description: 'List recent deployments that may have introduced a regression',
        parameters: {
            type: 'object',
            properties: {
                service: { type: 'string' },
                hoursBack: { type: 'number', default: 24 },
            },
            required: ['service'],
        },
    },
    run_db_query: {
        name: 'run_db_query',
        description: 'Execute a read-only SQL query to inspect database state (pg_stat_activity, locks, slow queries, etc.)',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'SELECT-only SQL' },
                database: { type: 'string' },
                timeoutMs: { type: 'number', default: 5000 },
            },
            required: ['query', 'database'],
        },
    },
    check_service_health: {
        name: 'check_service_health',
        description: 'HTTP health check of a service with component-level breakdown',
        parameters: {
            type: 'object',
            properties: {
                service: { type: 'string' },
                endpoint: { type: 'string', default: '/health' },
            },
            required: ['service'],
        },
    },
    search_runbooks: {
        name: 'search_runbooks',
        description: 'Search internal runbook knowledge base for similar past incidents and playbooks',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                limit: { type: 'number', default: 3 },
            },
            required: ['query'],
        },
    },
    get_dependency_graph: {
        name: 'get_dependency_graph',
        description: 'Get upstream and downstream service dependency graph with critical path',
        parameters: {
            type: 'object',
            properties: {
                service: { type: 'string' },
                depth: { type: 'number', default: 2 },
            },
            required: ['service'],
        },
    },
};

@Injectable()
export class IncidentToolsService {
    constructor(private readonly db: DbService) {}

    getByNames(names: string[]): AgentTool[] {
        return names.map((n) => ALL_TOOLS[n]).filter(Boolean);
    }

    async execute(toolName: string, args: Record<string, unknown>): Promise<unknown> {
        // Swap these stubs for real Datadog / ELK / PG integrations
        switch (toolName) {
            case 'query_logs': return this.mockLogs(args);
            case 'get_service_metrics': return this.mockMetrics(args);
            case 'check_recent_deployments': return this.mockDeployments(args);
            case 'run_db_query': return this.queryDb(args);
            case 'check_service_health': return this.checkHealth(args);
            case 'search_runbooks': return this.mockRunbooks(args);
            case 'get_dependency_graph': return this.mockDeps(args);
            default: throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    private mockLogs(a: any) {
        return {
            logs: [
                { ts: new Date().toISOString(), level: 'ERROR', service: a.service, msg: 'Connection pool exhausted: max=100 current=100 waiting=47' },
                { ts: new Date(Date.now() - 30_000).toISOString(), level: 'WARN', service: a.service, msg: 'Connection acquisition timeout after 5000ms' },
                { ts: new Date(Date.now() - 60_000).toISOString(), level: 'ERROR', service: a.service, msg: 'HikariPool-1 - Connection not available, request timed out after 30000ms' },
            ],
            total: 147, truncated: true,
        };
    }

    private mockMetrics(a: any) {
        return {
            service: a.service, window: `${a.windowMinutes ?? 30}m`,
            metrics: {
                cpu: { avg: 78.4, max: 94.2, unit: '%' },
                memory: { avg: 82.1, max: 89.7, unit: '%' },
                latency_p95: { avg: 3240, max: 8900, unit: 'ms' },
                latency_p99: { avg: 7800, max: 15_000, unit: 'ms' },
                error_rate: { avg: 0.34, max: 0.67, unit: 'ratio' },
                connections: { avg: 98.2, max: 100, unit: 'count' },
                rps: { avg: 2847, max: 3100, unit: 'req/s' },
            },
        };
    }

    private mockDeployments(a: any) {
        return {
            service: a.service,
            deployments: [
                { id: 'deploy-abc123', ts: new Date(Date.now() - 7_200_000).toISOString(), version: 'v2.14.1', author: 'will@example.com', changes: ['Increased default thread pool size', 'Updated DB connection timeout config'] },
                { id: 'deploy-xyz456', ts: new Date(Date.now() - 86_400_000).toISOString(), version: 'v2.14.0', author: 'john@example.com', changes: ['Feature: batch API endpoint'] },
            ],
        };
    }

    private async queryDb(args: any): Promise<unknown> {
        const query = (args.query as string ?? '').trim().toUpperCase();

        if (!query.startsWith('SELECT') && !query.startsWith('EXPLAIN')) {
            return { error: 'Only SELECT queries permitted', query: args.query };
        }

        try {
            const result = await this.db.pool.query({
                text: args.query as string,
                rowMode: 'array',
            });
            return {
                rows: result.rows.slice(0, 20),
                fields: result.fields.map(f => f.name),
                rowCount: result.rowCount,
                executionMs: 0,
            };
        } catch (err: any) {
            return { error: err.message, query: args.query };
        }
    }

    private async checkHealth(args: any): Promise<unknown> {
        const service = args.service as string;
        const endpoint = (args.endpoint as string) ?? '/health';
        const url = `http://localhost:3000${endpoint}`;

        try {
            const start = Date.now();
            const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
            const responseMs = Date.now() - start;
            let body: any = {};
            try { body = await res.json(); } catch { }
            return { service, status: res.ok ? 'healthy' : 'degraded', statusCode: res.status, responseMs, body };
        } catch (err: any) {
            return { service, status: 'unreachable', error: err.message };
        }
    }

    private mockRunbooks(a: any) {
        return {
            results: [
                { id: 'rb-001', title: 'HikariCP Connection Pool Exhaustion', similarity: 0.94, steps: ['Check pg_stat_activity for long-running transactions', 'Kill idle-in-transaction connections > 5min', 'Review maximumPoolSize and connectionTimeout', 'Check for connection leaks in recent deploys'] },
                { id: 'rb-002', title: 'DB Connection Spike During Traffic Surge', similarity: 0.71, steps: ['Enable PgBouncer connection pooling', 'Reduce maxPoolSize per instance', 'Add circuit breaker on DB calls'] },
            ],
        };
    }

    private mockDeps(a: any) {
        return {
            service: a.service,
            upstream: ['api-gateway', 'load-balancer'],
            downstream: ['postgres-primary', 'redis-cache', 'payment-service', 'notification-service'],
            criticalPath: [`api-gateway → ${a.service} → postgres-primary`],
        };
    }
}