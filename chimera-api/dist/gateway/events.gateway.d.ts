import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';
export declare class EventsGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly bus;
    server: Server;
    private readonly logger;
    constructor(bus: AgentMessageBusService);
    onModuleInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    getHistory(data: {
        fromId?: string;
    }): Promise<import("../agents/core/types").ChimeraEvent[]>;
}
