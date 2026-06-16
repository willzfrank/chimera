import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { BaseAgent } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { AgentFactory } from '../core/agent-factory';
import { ConsensusEngine } from '../core/consensus-engine';
import {
    AgentMessage, AgentResponse, AgentSpec,
    ConsensusResult, HumanCheckpoint, Incident, TopologySpec,
} from '../core/types';
import { SpecialistAgent } from '../specialists/specialist.agent';
import { AdversarialAgent } from '../adversarial/adversarial.agent';

const RESULT_TIMEOUT_MS = 120_000;

const ORCHESTRATOR_SPEC: AgentSpec = {
    role: 'meta-orchestrator',
    name: 'MetaOrchestrator',
    systemPrompt: `You are CHIMERA's Meta-Orchestrator. You coordinate a dynamic society of specialist and adversarial agents to resolve production incidents. You synthesize diverse expert input, manage escalation decisions, and ensure rigorous adversarial validation before any action is taken.`,
    tools: [],
};

export class MetaOrchestratorAgent extends BaseAgent {
    private readonly emitter = new EventEmitter();
    private specialistResults = new Map<string, AgentResponse>();
    private adversarialResults = new Map<string, AgentResponse>();
    private specialistTaskMap = new Map<string, string>();   // agentId → task
    private spawnedSpecialists: SpecialistAgent[] = [];
    private spawnedAdversarials: AdversarialAgent[] = [];

    constructor(
        qwen: QwenClient,
        bus: AgentMessageBusService,
        private readonly factory: AgentFactory,
        private readonly consensusEngine: ConsensusEngine,
    ) {
        super(ORCHESTRATOR_SPEC, qwen, bus);
        this.emitter.setMaxListeners(0);
    }

    async processIncident(incident: Incident): Promise<ConsensusResult> {
        this.correlationId = incident.id;
        this.logger.log(`[${incident.severity}] ${incident.title} (${incident.id})`);

        // ── 1. Synthesize topology ────────────────────────────────────────────
        const synthesizer = this.factory.createTopologySynthesizer(this.correlationId);
        let topology: TopologySpec;
        try {
            topology = await synthesizer.synthesize(incident);
        } finally {
            synthesizer.terminate();
        }

        await this.bus.emitEvent({
            type: 'topology_built',
            correlationId: this.correlationId,
            payload: {
                incidentClass: topology.incidentClass,
                rationale: topology.rationale,
                agentCount: topology.agents.length,
                graph: topology.communicationGraph,
            },
        });

        const specialistSpecs = topology.agents.filter((a) => a.role === 'specialist');
        if (specialistSpecs.length === 0) {
            throw new Error(`Invalid topology for incident ${incident.id}: no specialist agents generated (class=${topology.incidentClass})`);
        }

        // ── 2. Spawn society ──────────────────────────────────────────────────
        const { specialists, adversarials, adversarialToSpecialist } =
            this.spawnSociety(topology);

        this.spawnedSpecialists = specialists;
        this.spawnedAdversarials = adversarials;

        // ── 3. Dispatch specialist tasks (parallel) ───────────────────────────
        await this.dispatchSpecialistTasks(specialists, incident);
        await this.waitFor('specialist', specialists.length);

        // ── 4. Dispatch adversarial challenges (after specialists done) ───────
        await this.dispatchAdversarialChallenges(adversarials, adversarialToSpecialist);
        await this.waitFor('adversarial', adversarials.length);

        // ── 5. Consensus ──────────────────────────────────────────────────────
        const consensus = await this.consensusEngine.reach(
            incident,
            Array.from(this.specialistResults.values()),
            Array.from(this.adversarialResults.values()),
        );

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

        // ── 6. Human checkpoint ───────────────────────────────────────────────
        if (consensus.requiresHumanCheckpoint) {
            const checkpoint: HumanCheckpoint = {
                id: uuidv4(),
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
                payload: checkpoint as unknown as Record<string, unknown>,
            });
            this.logger.warn(`Human approval required — checkpointId=${checkpoint.id}`);
        }

        // ── 7. Done ───────────────────────────────────────────────────────────
        this.terminateSociety();

        await this.bus.emitEvent({
            type: 'incident_resolved',
            correlationId: this.correlationId,
            payload: {
                incidentId: incident.id,
                decision: consensus.decision,
                confidence: consensus.confidence,
                agentsUsed: specialists.length + adversarials.length,
            },
        });

        this.logger.log(`Resolved: ${incident.id} — confidence=${consensus.confidence.toFixed(2)}`);
        this.terminate();
        return consensus;
    }

    protected async handleMessage(msg: AgentMessage): Promise<void> {
        if (msg.type === 'result' && msg.payload.type === 'specialist_result') {
            this.specialistResults.set(msg.fromAgentId, {
                agentId: msg.payload.agentId as string,
                content: msg.payload.content as string,
                confidence: msg.payload.confidence as number,
                timestamp: Date.now(),
            });
            this.emitter.emit('specialist');
            this.logger.debug(`Specialist in: ${msg.fromAgentId} [${this.specialistResults.size} total]`);
        }

        if (msg.type === 'challenge' && msg.payload.type === 'adversarial_challenge') {
            this.adversarialResults.set(msg.fromAgentId, {
                agentId: msg.payload.agentId as string,
                content: msg.payload.content as string,
                confidence: msg.payload.confidence as number,
                timestamp: Date.now(),
            });
            this.emitter.emit('adversarial');
            this.logger.debug(`Adversarial in: ${msg.fromAgentId} [${this.adversarialResults.size} total]`);
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private spawnSociety(topology: TopologySpec): {
        specialists: SpecialistAgent[];
        adversarials: AdversarialAgent[];
        adversarialToSpecialist: Map<string, string>; // adversarial agentId → specialist agentId
    } {
        const specialists: SpecialistAgent[] = [];
        const adversarials: AdversarialAgent[] = [];
        const nameToId = new Map<string, string>();
        const adversarialToSpecialist = new Map<string, string>();

        // Specialists first — build name→id map for adversarial pairing
        for (const spec of topology.agents.filter((a) => a.role === 'specialist')) {
            const agent = this.factory.createSpecialist(spec, this.correlationId, this.agentId);
            specialists.push(agent);
            nameToId.set(spec.name, agent.agentId);
        }

        for (const spec of topology.agents.filter((a) => a.role === 'adversarial')) {
            const targetId = spec.adversarialPairName ? (nameToId.get(spec.adversarialPairName) ?? '') : '';
            const agent = this.factory.createAdversarial(spec, this.correlationId, targetId, this.agentId);
            adversarials.push(agent);
            if (targetId) adversarialToSpecialist.set(agent.agentId, targetId);
        }

        this.logger.log(`Spawned: ${specialists.length} specialists, ${adversarials.length} adversarials`);
        return { specialists, adversarials, adversarialToSpecialist };
    }

    private async dispatchSpecialistTasks(specialists: SpecialistAgent[], incident: Incident): Promise<void> {
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

            // Fire and forget — specialists run in parallel
            agent.investigate(task).catch((err) =>
                this.logger.error(`Specialist ${agent.agentId} failed:`, err),
            );
        }
    }

    private async dispatchAdversarialChallenges(
        adversarials: AdversarialAgent[],
        adversarialToSpecialist: Map<string, string>,
    ): Promise<void> {
        for (const adversarial of adversarials) {
            const specialistId = adversarialToSpecialist.get(adversarial.agentId);
            if (!specialistId) continue;

            const specialistResult = this.specialistResults.get(specialistId);
            if (!specialistResult) {
                this.logger.warn(`No result from specialist ${specialistId} for adversarial ${adversarial.agentId}`);
                continue;
            }

            const originalTask = this.specialistTaskMap.get(specialistId) ?? '';

            adversarial.challenge(specialistResult.content, originalTask).catch((err) =>
                this.logger.error(`Adversarial ${adversarial.agentId} failed:`, err),
            );
        }
    }

    private waitFor(type: 'specialist' | 'adversarial', expected: number): Promise<void> {
        const map = type === 'specialist' ? this.specialistResults : this.adversarialResults;

        return new Promise((resolve) => {
            let timer: NodeJS.Timeout;

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

            // Register BEFORE checking — closes the race window
            this.emitter.on(type, check);

            // Handles results already in before listener registered
            check();

            if (expected === 0) return;

            timer = setTimeout(() => {
                this.logger.warn(`Timeout: ${map.size}/${expected} ${type} results — proceeding with partial data`);
                cleanup();
                resolve();
            }, RESULT_TIMEOUT_MS);
        });
    }

    private terminateSociety(): void {
        [...this.spawnedSpecialists, ...this.spawnedAdversarials].forEach((a) => a.terminate());
        this.spawnedSpecialists = [];
        this.spawnedAdversarials = [];
        this.specialistResults.clear();
        this.adversarialResults.clear();
        this.specialistTaskMap.clear();
    }
}