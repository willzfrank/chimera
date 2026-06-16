import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AgentMessage, ChimeraEvent } from './types';
export declare class AgentMessageBusService implements OnModuleInit, OnModuleDestroy {
    private publisher;
    private subscriber;
    private handlers;
    private eventHandlers;
    onModuleInit(): void;
    publish(toAgentId: string, message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<void>;
    emitEvent(event: Omit<ChimeraEvent, 'timestamp'>): Promise<void>;
    subscribe(agentId: string, handler: (msg: AgentMessage) => Promise<void>): void;
    unsubscribe(agentId: string): void;
    onEvent(handler: (event: ChimeraEvent) => void): void;
    onModuleDestroy(): Promise<void>;
}
