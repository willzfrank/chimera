"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaOrchestratorAgent = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const base_agent_1 = require("../core/base.agent");
const RESULT_TIMEOUT_MS = 120_000;
const ORCHESTRATOR_SPEC = {
    role: 'meta-orchestrator',
    name: 'MetaOrchestrator',
    systemPrompt: `You are CHIMERA's Meta-Orchestrator. You coordinate a dynamic society of specialist and adversarial agents to resolve production incidents. You synthesize diverse expert input, manage escalation decisions, and ensure rigorous adversarial validation before any action is taken.`,
    tools: [],
};
class MetaOrchestratorAgent extends base_agent_1.BaseAgent {
    factory;
    consensusEngine;
    memory;
    learning;
    analytics;
    slack;
    emitter = new events_1.EventEmitter();
    specialistResults = new Map();
    adversarialResults = new Map();
    specialistTaskMap = new Map();
    spawnedSpecialists = [];
    spawnedAdversarials = [];
    constructor(qwen, bus, factory, consensusEngine, memory, learning, analytics, slack) {
        super(ORCHESTRATOR_SPEC, qwen, bus);
        this.factory = factory;
        this.consensusEngine = consensusEngine;
        this.memory = memory;
        this.learning = learning;
        this.analytics = analytics;
        this.slack = slack;
        this.emitter.setMaxListeners(0);
    }
    async processIncident(incident) {
        const startTime = Date.now();
        this.correlationId = incident.id;
        this.logger.log(`[${incident.severity}] ${incident.title}`);
        let topology = null;
        let fromMemory = false;
        if (this.memory) {
            const recalled = await this.memory.recall(incident.description);
            if (recalled) {
                topology = recalled;
                fromMemory = true;
                this.logger.log(`Memory HIT: class=${topology.incidentClass} — skipping synthesis`);
            }
        }
        if (topology && fromMemory && this.learning) {
            const patterns = await this.learning.getPatterns(topology.incidentClass);
            if (patterns.length > 0) {
                const patternText = `\n\nLEARNED PATTERNS:\n${patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
                topology = {
                    ...topology,
                    agents: topology.agents.map(a => a.role === 'specialist'
                        ? { ...a, systemPrompt: a.systemPrompt + patternText }
                        : a),
                };
                this.logger.log(`Injected ${patterns.length} learned patterns into recalled topology`);
            }
        }
        if (!topology) {
            const synthesizer = this.factory.createTopologySynthesizer(this.correlationId);
            try {
                topology = await synthesizer.synthesize(incident);
            }
            finally {
                synthesizer.terminate();
            }
        }
        if (!topology.agents.filter(a => a.role === 'specialist').length) {
            throw new Error(`Invalid topology: no specialists for ${incident.id}`);
        }
        await this.bus.emitEvent({
            type: 'topology_built',
            correlationId: this.correlationId,
            payload: {
                incidentClass: topology.incidentClass,
                rationale: fromMemory ? 'Recalled from memory' : topology.rationale,
                fromMemory,
                agentCount: topology.agents.length,
                agents: topology.agents.map(a => ({
                    name: a.name,
                    role: a.role,
                    adversarialPairName: a.adversarialPairName,
                })),
                graph: topology.communicationGraph,
            },
        });
        const { specialists, adversarials, adversarialToSpecialist } = this.spawnSociety(topology);
        this.spawnedSpecialists = specialists;
        this.spawnedAdversarials = adversarials;
        await this.dispatchSpecialistTasks(specialists, incident);
        await this.waitFor('specialist', specialists.length);
        await this.dispatchAdversarialChallenges(adversarials, adversarialToSpecialist);
        await this.waitFor('adversarial', adversarials.length);
        const consensus = await this.consensusEngine.reach(incident, Array.from(this.specialistResults.values()), Array.from(this.adversarialResults.values()));
        await this.bus.emitEvent({
            type: 'consensus_reached',
            correlationId: this.correlationId,
            payload: {
                agreed: consensus.agreed,
                confidence: consensus.confidence,
                requiresHuman: consensus.requiresHumanCheckpoint,
                dissents: consensus.dissents.length,
                decision: consensus.decision,
            },
        });
        if (consensus.requiresHumanCheckpoint) {
            const checkpoint = {
                id: (0, uuid_1.v4)(),
                correlationId: this.correlationId,
                summary: `[${incident.severity}] ${incident.title}`,
                proposedAction: consensus.decision,
                risks: [],
                agentConsensus: consensus,
                createdAt: Date.now(),
            };
            await this.bus.emitEvent({
                type: 'human_checkpoint',
                correlationId: this.correlationId,
                payload: checkpoint,
            });
        }
        const resolutionMs = Date.now() - startTime;
        if (this.learning && consensus.confidence > 0.75) {
            const findings = Array.from(this.specialistResults.values()).map(r => r.content);
            await this.learning.extractAndStore(topology.incidentClass, incident.description, findings, consensus.decision, consensus.confidence).catch(() => { });
        }
        if (this.memory && !fromMemory && consensus.confidence > 0.7) {
            await this.memory.store(incident.description, topology, consensus.confidence, resolutionMs);
        }
        this.terminateSociety();
        if (this.analytics) {
            const tokensUsed = this.qwen.getMetrics().promptTokens + this.qwen.getMetrics().completionTokens;
            await this.analytics.recordIncident(incident, consensus, topology.incidentClass, fromMemory, specialists.length + adversarials.length, resolutionMs, tokensUsed).catch(err => this.logger.warn(`Analytics record failed: ${err}`));
        }
        if (this.slack) {
            await this.slack.notifyResolution(incident, consensus, resolutionMs, fromMemory).catch(() => { });
        }
        await this.bus.emitEvent({
            type: 'incident_resolved',
            correlationId: this.correlationId,
            payload: {
                incidentId: incident.id,
                decision: consensus.decision,
                confidence: consensus.confidence,
                agentsUsed: specialists.length + adversarials.length,
                resolutionMs,
                fromMemory,
            },
        });
        this.logger.log(`Resolved in ${resolutionMs}ms — confidence=${consensus.confidence.toFixed(2)}`);
        this.terminate();
        return consensus;
    }
    async handleMessage(msg) {
        if (msg.type === 'result' && msg.payload.type === 'specialist_result') {
            this.specialistResults.set(msg.fromAgentId, {
                agentId: msg.payload.agentId,
                content: msg.payload.content,
                confidence: msg.payload.confidence,
                timestamp: Date.now(),
            });
            this.emitter.emit('specialist');
            this.logger.debug(`Specialist in: ${msg.fromAgentId} [${this.specialistResults.size} total]`);
        }
        if (msg.type === 'challenge' && msg.payload.type === 'adversarial_challenge') {
            this.adversarialResults.set(msg.fromAgentId, {
                agentId: msg.payload.agentId,
                content: msg.payload.content,
                confidence: msg.payload.confidence,
                timestamp: Date.now(),
            });
            this.emitter.emit('adversarial');
            this.logger.debug(`Adversarial in: ${msg.fromAgentId} [${this.adversarialResults.size} total]`);
        }
    }
    spawnSociety(topology) {
        const specialists = [];
        const adversarials = [];
        const nameToId = new Map();
        const adversarialToSpecialist = new Map();
        for (const spec of topology.agents.filter((a) => a.role === 'specialist')) {
            const agent = this.factory.createSpecialist(spec, this.correlationId, this.agentId);
            specialists.push(agent);
            nameToId.set(spec.name, agent.agentId);
        }
        for (const spec of topology.agents.filter((a) => a.role === 'adversarial')) {
            const targetId = spec.adversarialPairName ? (nameToId.get(spec.adversarialPairName) ?? '') : '';
            const agent = this.factory.createAdversarial(spec, this.correlationId, targetId, this.agentId);
            adversarials.push(agent);
            if (targetId)
                adversarialToSpecialist.set(agent.agentId, targetId);
        }
        this.logger.log(`Spawned: ${specialists.length} specialists, ${adversarials.length} adversarials`);
        return { specialists, adversarials, adversarialToSpecialist };
    }
    async dispatchSpecialistTasks(specialists, incident) {
        for (const agent of specialists) {
            const task = `You are investigating a production incident. Apply your specialist expertise to diagnose the root cause.

INCIDENT:
- Title: ${incident.title}
- Severity: ${incident.severity}
- Description: ${incident.description}
- Metadata: ${JSON.stringify(incident.metadata, null, 2)}

Specialist role: ${agent.name}
Goal: Identify root cause, supporting evidence, and recommended remediation — within your domain only.
Use your tools to gather concrete evidence before forming conclusions.`;
            this.specialistTaskMap.set(agent.agentId, task);
            agent.investigate(task).catch((err) => this.logger.error(`Specialist ${agent.agentId} failed:`, err));
        }
    }
    async dispatchAdversarialChallenges(adversarials, adversarialToSpecialist) {
        for (const adversarial of adversarials) {
            const specialistId = adversarialToSpecialist.get(adversarial.agentId);
            if (!specialistId)
                continue;
            const specialistResult = this.specialistResults.get(specialistId);
            if (!specialistResult) {
                this.logger.warn(`No result from specialist ${specialistId} for adversarial ${adversarial.agentId}`);
                continue;
            }
            const originalTask = this.specialistTaskMap.get(specialistId) ?? '';
            adversarial.challenge(specialistResult.content, originalTask).catch((err) => this.logger.error(`Adversarial ${adversarial.agentId} failed:`, err));
        }
    }
    waitFor(type, expected) {
        const map = type === 'specialist' ? this.specialistResults : this.adversarialResults;
        return new Promise((resolve) => {
            let timer;
            const cleanup = () => {
                clearTimeout(timer);
                this.emitter.off(type, check);
            };
            const check = () => {
                if (map.size >= expected) {
                    cleanup();
                    resolve();
                }
            };
            this.emitter.on(type, check);
            check();
            if (expected === 0)
                return;
            timer = setTimeout(() => {
                this.logger.warn(`Timeout: ${map.size}/${expected} ${type} results — proceeding with partial data`);
                cleanup();
                resolve();
            }, RESULT_TIMEOUT_MS);
        });
    }
    terminateSociety() {
        [...this.spawnedSpecialists, ...this.spawnedAdversarials].forEach((a) => a.terminate());
        this.spawnedSpecialists = [];
        this.spawnedAdversarials = [];
        this.specialistResults.clear();
        this.adversarialResults.clear();
        this.specialistTaskMap.clear();
    }
}
exports.MetaOrchestratorAgent = MetaOrchestratorAgent;
//# sourceMappingURL=meta-orchestrator.agent.js.map