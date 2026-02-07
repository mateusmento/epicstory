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
    payload,
  }: {
    type: string;
    userId: number;
    payload: any;
  }) {
    const notification = new Notification({
      type,
      userId,
      payload,
      seen: false,
      createdAt: new Date(),
    });
    await this.notificationRepository.save(notification);
    await this.notificationGateway.sendNotification(userId, notification);
  }
}
