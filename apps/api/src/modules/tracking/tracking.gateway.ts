import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(TrackingGateway.name);

  afterInit() {
    this.logger.log('Tracking WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket) {
    client.join('tracking-room');
    this.logger.debug(`Client ${client.id} subscribed to tracking`);
  }

  broadcastUpdate(deliveries: any[]) {
    this.server.to('tracking-room').emit('tracking:update', deliveries);
  }

  broadcastPackageStatus(data: { packageId: string; trackingNumber: string; status: string; riderName?: string }) {
    this.server.to('tracking-room').emit('tracking:status', data);
  }
}
