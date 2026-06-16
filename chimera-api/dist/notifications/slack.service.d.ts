import { ConsensusResult, Incident } from '../agents/core/types';
export declare class SlackService {
    private readonly logger;
    notifyResolution(incident: Incident, result: ConsensusResult, resolutionMs: number, fromMemory: boolean): Promise<void>;
}
