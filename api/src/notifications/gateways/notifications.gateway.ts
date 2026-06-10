import type {
  SubscribeNotificationsBody,
  UnsubscribeNotificationsBody,
} from '@epicstory/contracts';
import { notificationEntityToClient } from '../utils/notification-entity-to-client';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { EpicstoryServer } from 'src/core';
import { Notification } from '../entities';

@WebSocketGateway()
export class NotificationGateway {
  @WebSocketServer()
  server: EpicstoryServer;

  sendNotification(userId: number, notification: Notification) {
    // In some execution contexts (e.g. unit/integration tests) the websocket server may not be initialized.
    if (!this.server) return;
    this.server
      .to(`user:${userId}:notifications`)
      .emit('incoming-notification', notificationEntityToClient(notification));
  }

  @SubscribeMessage('subscribe-notifications')
  private async subscribeNotifications(
    @MessageBody() { userId }: SubscribeNotificationsBody,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.join(`user:${userId}:notifications`);
  }

  @SubscribeMessage('unsubscribe-notifications')
  private async unsubscribeNotifications(
    @MessageBody() { userId }: UnsubscribeNotificationsBody,
    @ConnectedSocket() socket: Socket,
  ) {
    socket.leave(`user:${userId}:notifications`);
  }
}
