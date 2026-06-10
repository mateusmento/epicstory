import type { CommandBus } from '@nestjs/cqrs';
import type { Channel } from 'src/channel/domain/entities/channel.entity';
import type { IMessage, NotificationPayload } from '@epicstory/contracts';
import { SendNotification } from 'src/notifications/features/send-notification.command';

/** Shared by `SendMessage` and issue `CreateIssueComment` orchestration. */
export async function dispatchNotificationsForMessageSent(
  commandBus: CommandBus,
  channel: Channel,
  message: IMessage,
  senderId: number,
): Promise<void> {
  const mentionIds = (message.mentionedUsers ?? [])
    .filter((user) => user.id !== senderId)
    .map((user) => user.id);

  if (mentionIds.length > 0) {
    await commandBus.execute(
      new SendNotification({
        type: 'mention',
        userIds: mentionIds,
        workspaceId: channel.workspaceId,
        payload: {
          channel,
          message,
          sender: message.sender,
          mentionedUsers: message.mentionedUsers,
        } as unknown as NotificationPayload,
      }),
    );
  }

  const directMessageUserIds = (channel.peers ?? [])
    .map((peer) => peer.id)
    .filter((id) => ![senderId, ...mentionIds].includes(id));

  const shouldSendDMNotification =
    (channel.type === 'direct' || channel.type === 'multi-direct') &&
    directMessageUserIds.length > 0;

  if (shouldSendDMNotification) {
    await commandBus.execute(
      new SendNotification({
        userIds: directMessageUserIds,
        type: 'direct_message',
        workspaceId: channel.workspaceId,
        payload: {
          message,
          channel,
          sender: message.sender,
        } as unknown as NotificationPayload,
      }),
    );
  }
}
