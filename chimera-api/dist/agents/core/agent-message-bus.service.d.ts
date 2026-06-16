import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AgentMessage, ChimeraEvent } from './types';
export declare class AgentMessageBusService implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private cmd;
    private reader;
    private pub;
    private handlers;
    private pollers;
    private eventListeners;
    onModuleInit(): void;
    registerAgent(agentId: string, handler: (msg: AgentMessage) => Promise<void>): Promise<void>;
    unregister(agentId: string): void;
    publish(toAgentId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string>;
    emitEvent(event: Omit<ChimeraEvent, 'timestamp'>): Promise<void>;
    getEventHistory(fromId?: string): Promise<ChimeraEvent[]>;
    onEvent(fn: (e: ChimeraEvent) => void): void;
    private poll;
    private processEntries;
    private retryPending;
    private dlq;
    private streamKey;
    private sleep;
    onModuleDestroy(): Promise<void>;
}
