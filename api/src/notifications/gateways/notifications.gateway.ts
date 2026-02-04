import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Notification } from '../entities';

@WebSocketGateway()
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  sendNotification(userId: number, notification: Notification) {
    this.server
      .to(`user:${userId}:notifications`)
      .emit('incoming-notification', notification);
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
