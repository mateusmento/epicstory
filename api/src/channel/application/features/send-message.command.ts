import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
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

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number;

  /** Set only from scheduled-message job delivery; not accepted from public HTTP body. */
  @IsOptional()
  @IsBoolean()
  markAsScheduled?: boolean;

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

  async execute({
    channelId,
    senderId,
    content,
    contentRich,
    quotedMessageId,
    markAsScheduled,
  }: SendMessage) {
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
      quotedMessageId,
      { isScheduled: markAsScheduled === true },
    );

    const mentionIds = message.mentionedUsers
      .filter((user) => user.id !== senderId)
      .map((user) => user.id);

    if (channel.type === 'direct' || channel.type === 'multi-direct') {
      await this.commandBus.execute(
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
      await this.commandBus.execute(
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

    return message;
  }
}
