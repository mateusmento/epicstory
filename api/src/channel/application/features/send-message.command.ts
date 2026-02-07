import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { SendNotification } from 'src/notifications/features/send-notification.command';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound, SenderIsNotChannelMember } from '../exceptions';
import { MessageService } from '../services/message.service';
import { extractMentionIds, renderMentions } from '../utils/mentions';
import { normalizeTiptapDoc, tiptapToPlainText } from '../utils/tiptap';

export class SendMessage {
  channelId: number;
  senderId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  contentRich?: any;

  constructor(data: Partial<SendMessage>) {
    patch(this, data);
  }
}

@CommandHandler(SendMessage)
export class SendMessageCommand implements ICommandHandler<SendMessage> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private messageRepo: MessageRepository,
    private messageService: MessageService,
    private commandBus: CommandBus,
  ) {}

  async execute({ channelId, senderId, content, contentRich }: SendMessage) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) {
      throw new ChannelNotFound();
    }

    const senderMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      senderId,
    );
    if (!senderMember) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const peerIds = channel.peers.map((peer) => peer.id);
    if (!peerIds.includes(senderId)) {
      throw new SenderIsNotChannelMember();
    }

    const normalizedRich = contentRich
      ? normalizeTiptapDoc(contentRich)
      : undefined;
    const plainContent = normalizedRich
      ? tiptapToPlainText(normalizedRich)
      : content;

    const { id } = await this.messageService.createMessage(
      plainContent,
      channelId,
      senderId,
      normalizedRich,
    );

    const message = await this.messageRepo.findOne({
      where: { id },
      relations: {
        sender: true,
      },
    });

    const peerUsersMap = new Map(channel.peers.map((u) => [u.id, u]));
    const mentionIds = extractMentionIds(plainContent);
    const finalMentionIds = mentionIds.filter(
      (id) => id !== senderId && peerUsersMap.has(id),
    );
    const mentionedUsers = finalMentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    const displayContent = renderMentions(plainContent, peerUsersMap);

    (message as any).mentionedUsers = mentionedUsers;
    (message as any).displayContent = displayContent;

    // DM notification (Inbox) only for direct / multi-direct channels
    if (channel.type === 'direct' || channel.type === 'multi-direct') {
      await this.commandBus.execute(
        new SendNotification({
          userIds: peerIds.filter((id) => id !== senderId),
          type: 'direct_message',
          payload: {
            message,
            channel,
            sender: message.sender,
          },
        }),
      );
    }

    if (finalMentionIds.length > 0) {
      await this.commandBus.execute(
        new SendNotification({
          type: 'mention',
          userIds: finalMentionIds,
          payload: {
            channel,
            sender: message.sender,
            message: displayContent,
            mentionedUsers,
          },
        }),
      );
    }

    return message;
  }
}
