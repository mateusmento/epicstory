import type { IReply, NotificationPayload } from '@epicstory/contracts';
import type { CommandBus } from '@nestjs/cqrs';
import type { Channel } from 'src/channel/domain/entities/channel.entity';
import type { Message } from 'src/channel/domain/entities/message.entity';
import { SendNotification } from 'src/notifications/features/send-notification.command';

/** Shared by `ReplyMessage` and issue `ReplyToIssueComment` orchestration. */
export async function dispatchNotificationsForReplySent(
  commandBus: CommandBus,
  channel: Channel,
  parentMessage: Message,
  reply: IReply,
  senderId: number,
): Promise<void> {
  const mentionIds = (reply.mentionedUsers ?? [])
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
          sender: reply.sender,
          message: reply.displayContent,
          reply,
          mentionedUsers: reply.mentionedUsers,
        } as unknown as NotificationPayload,
      }),
    );
  }

  const shouldSendReplyNotification =
    parentMessage.senderId !== senderId &&
    !mentionIds.includes(parentMessage.senderId);

  if (shouldSendReplyNotification) {
    await commandBus.execute(
      new SendNotification({
        userIds: [parentMessage.senderId],
        type: 'reply',
        workspaceId: channel.workspaceId,
        payload: {
          reply,
          message: parentMessage,
          channel,
          sender: reply.sender,
        } as unknown as NotificationPayload,
      }),
    );
  }
}
