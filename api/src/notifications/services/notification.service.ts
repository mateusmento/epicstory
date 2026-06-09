import { Injectable } from '@nestjs/common';
import { NotificationRepository } from '../repositories';
import { NotificationGateway } from '../gateways';
import { Notification } from '../entities';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async sendNotification({
    type,
    userId,
    workspaceId,
    payload,
  }: {
    type: string;
    userId: number;
    workspaceId: number;
    payload: Record<string, any>;
  }) {
    payload.type = type ?? payload?.type;

    const notification = new Notification({
      type,
      userId,
      workspaceId,
      payload,
      seen: false,
      createdAt: new Date(),
    });
    await this.notificationRepository.save(notification);
    await this.notificationGateway.sendNotification(userId, notification);
  }
}
