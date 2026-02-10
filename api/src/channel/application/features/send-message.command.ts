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

    const message = await this.messageService.createMessage(
      channel,
      senderId,
      content,
      contentRich,
    );

    const mentionIds = message.mentionedUsers
      .filter((user) => user.id !== senderId)
      .map((user) => user.id);

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

    if (mentionIds.length > 0) {
      await this.commandBus.execute(
        new SendNotification({
          type: 'mention',
          userIds: mentionIds,
          payload: {
            channel,
            sender: message.sender,
            message: message.displayContent,
            mentionedUsers: message.mentionedUsers,
          },
        }),
      );
    }

    return message;
  }
}
