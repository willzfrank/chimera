import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
} from '@nestjs/websockets';
import { Logger, OnModuleInit } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { AgentMessageBusService } from '../agents/core/agent-message-bus.service';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventsGateway implements OnModuleInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(EventsGateway.name);

    constructor(private readonly bus: AgentMessageBusService) { }

    onModuleInit() {
        this.bus.onEvent((event) => {
            this.server?.emit('chimera:event', event);
        });
        this.logger.log('WebSocket gateway ready');
    }

    handleConnection(client: Socket) {
        this.logger.debug(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.debug(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('get_history')
    async getHistory(@MessageBody() data: { fromId?: string }) {
        return this.bus.getEventHistory(data?.fromId ?? '0-0');
    }
}