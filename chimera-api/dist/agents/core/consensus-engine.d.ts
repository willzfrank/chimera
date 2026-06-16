import { QwenClient } from '../../qwen/qwen.client';
import { AgentResponse, ConsensusResult, Incident } from './types';
export declare class ConsensusEngine {
    private readonly qwen;
    private readonly logger;
    constructor(qwen: QwenClient);
    reach(incident: Incident, specialistResults: AgentResponse[], adversarialResults: AgentResponse[]): Promise<ConsensusResult>;
}
