import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  sendNotification(userId: number, payload: any) {
    this.server
      .to(`user:${userId}:notifications`)
      .emit('incoming-notification', payload);
  }

  @SubscribeMessage('subscribe-notifications')
  private async subscribeNotifications(
    @MessageBody() { userId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`user:${userId}:notifications`);
  }

  @SubscribeMessage('unsubscribe-notifications')
  private async unsubscribeNotifications(
    @MessageBody() { userId }: any,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(`user:${userId}:notifications`);
  }
}
