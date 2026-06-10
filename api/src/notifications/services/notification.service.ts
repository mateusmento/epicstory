import type { NotificationType } from '@epicstory/contracts';
import { Injectable } from '@nestjs/common';
import { Notification } from '../entities';
import { NotificationGateway } from '../gateways';
import { NotificationRepository } from '../repositories';
import type { SendNotificationInput } from '../types/send-notification-input';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  async sendNotification<T extends NotificationType>(
    input: SendNotificationInput<T>,
  ) {
    const { type, userId, workspaceId, payload } = input;
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
