import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import {
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { SendNotification } from 'src/notifications/features/send-notification.command';
import { MessageNotFound, SenderIsNotChannelMember } from '../exceptions';
import { extractMentionIds, renderMentions } from '../utils/mentions';
import { normalizeTiptapDoc, tiptapToPlainText } from '../utils/tiptap';

export class ReplyMessage {
  messageId: number;
  senderId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  contentRich?: any;

  constructor(data: Partial<ReplyMessage> = {}) {
    patch(this, data);
  }
}

@CommandHandler(ReplyMessage)
export class ReplyMessageCommand implements ICommandHandler<ReplyMessage> {
  constructor(
    private messageReplyRepo: MessageReplyRepository,
    private messageRepo: MessageRepository,
    private commandBus: CommandBus,
  ) {}

  async execute({ senderId, content, contentRich, messageId }: ReplyMessage) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { channel: { peers: true } },
    });
    if (!message) throw new MessageNotFound();

    const peerIds = message.channel.peers.map((peer) => peer.id);
    if (!peerIds.includes(senderId)) {
      throw new SenderIsNotChannelMember();
    }

    const normalizedRich = contentRich
      ? normalizeTiptapDoc(contentRich)
      : undefined;
    const plainContent = normalizedRich
      ? tiptapToPlainText(normalizedRich)
      : content;

    const { id: replyId } = await this.messageReplyRepo.save({
      content: plainContent,
      contentRich: normalizedRich,
      channelId: message.channelId,
      messageId,
      senderId,
      sentAt: new Date(),
    });

    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
      relations: { sender: true, allReactions: { user: true } },
    });

    reply.setReactions(senderId);

    const peerUsersMap = new Map(message.channel.peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIds(plainContent);
    const finalMentionIds = mentionIds.filter(
      (id) => id !== senderId && peerUsersMap.has(id),
    );
    const mentionedUsers = finalMentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    const displayContent = renderMentions(plainContent, peerUsersMap);

    (reply as any).mentionedUsers = mentionedUsers;
    (reply as any).displayContent = displayContent;

    if (finalMentionIds.length > 0) {
      await this.commandBus.execute(
        new SendNotification({
          type: 'mention',
          userIds: finalMentionIds,
          payload: {
            channel: message.channel,
            sender: reply.sender,
            message: displayContent,
            reply,
            mentionedUsers,
          },
        }),
      );
    }

    // If the original sender is mentioned, don't also send a reply notification.
    const shouldSendReplyNotification =
      message.senderId !== senderId &&
      !finalMentionIds.includes(message.senderId);

    if (shouldSendReplyNotification) {
      await this.commandBus.execute(
        new SendNotification({
          userIds: [message.senderId],
          type: 'reply',
          payload: {
            reply,
            message,
            channel: message.channel,
            sender: reply.sender,
          },
        }),
      );
    }

    return reply;
  }
}
