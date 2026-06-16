import { BaseAgent } from '../core/base.agent';
import { QwenClient } from '../../qwen/qwen.client';
import { AgentMessageBusService } from '../core/agent-message-bus.service';
import { AgentFactory } from '../core/agent-factory';
import { ConsensusEngine } from '../core/consensus-engine';
import { AgentMessage, ConsensusResult, Incident } from '../core/types';
export declare class MetaOrchestratorAgent extends BaseAgent {
    private readonly factory;
    private readonly consensusEngine;
    private readonly emitter;
    private specialistResults;
    private adversarialResults;
    private specialistTaskMap;
    private spawnedSpecialists;
    private spawnedAdversarials;
    constructor(qwen: QwenClient, bus: AgentMessageBusService, factory: AgentFactory, consensusEngine: ConsensusEngine);
    processIncident(incident: Incident): Promise<ConsensusResult>;
    protected handleMessage(msg: AgentMessage): Promise<void>;
    private spawnSociety;
    private dispatchSpecialistTasks;
    private dispatchAdversarialChallenges;
    private waitFor;
    private terminateSociety;
}
