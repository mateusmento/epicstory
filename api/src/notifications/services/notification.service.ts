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
    payload: any;
  }) {
    // Defensive fallback: some callers may still omit workspaceId. Try to infer it from common payload shapes.
    const inferredWorkspaceId =
      workspaceId ??
      payload?.workspaceId ??
      payload?.channel?.workspaceId ??
      payload?.message?.channel?.workspaceId ??
      payload?.reply?.channel?.workspaceId ??
      payload?.reply?.message?.channel?.workspaceId;

    if (inferredWorkspaceId === undefined || inferredWorkspaceId === null) {
      throw new Error(
        `NotificationService.sendNotification requires workspaceId (type=${type}, userId=${userId})`,
      );
    }

    const notification = new Notification({
      type,
      userId,
      workspaceId: inferredWorkspaceId,
      payload,
      seen: false,
      createdAt: new Date(),
    });
    await this.notificationRepository.save(notification);
    await this.notificationGateway.sendNotification(userId, notification);
  }
}
