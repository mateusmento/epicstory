import type { CommandBus } from '@nestjs/cqrs';
import type { Channel } from 'src/channel/domain/entities/channel.entity';
import type { IMessagePayload } from 'src/channel/application/services/message.service';
import { SendNotification } from 'src/notifications/features/send-notification.command';

/** Shared by `SendMessage` and issue `CreateIssueComment` orchestration. */
export async function dispatchNotificationsForMessageSent(
  commandBus: CommandBus,
  channel: Channel,
  message: IMessagePayload,
  senderId: number,
): Promise<void> {
  const mentionIds = (message.mentionedUsers ?? [])
    .filter((user) => user.id !== senderId)
    .map((user) => user.id);

  const peerIds = (channel.peers ?? []).map((peer) => peer.id);

  if (channel.type === 'direct' || channel.type === 'multi-direct') {
    await commandBus.execute(
      new SendNotification({
        userIds: peerIds.filter(
          (id) => ![senderId, ...mentionIds].includes(id),
        ),
        type: 'direct_message',
        workspaceId: channel.workspaceId,
        payload: {
          message,
          channel,
          sender: message.sender,
        },
      }),
    );
  }

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
        },
      }),
    );
  }
}
