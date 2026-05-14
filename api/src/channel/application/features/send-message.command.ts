import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import type { JSONContent } from '@tiptap/core';
import { patch } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound, SenderIsNotChannelMember } from '../exceptions';
import { MessageService } from '../services/message.service';
import { dispatchNotificationsForMessageSent } from '../utils/dispatch-message-notifications';
import { Transactional } from 'typeorm-transactional';
import { MessagePollBody } from '../dtos/message-poll.dto';

export class SendMessage {
  channelId: number;
  senderId: number;

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number;

  /** Set only from scheduled-message job delivery; not accepted from public HTTP body. */
  @IsOptional()
  @IsBoolean()
  markAsScheduled?: boolean;

  /** Staged uploads to bind to this message after send. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  @IsOptional()
  @ValidateNested()
  @Type(() => MessagePollBody)
  poll?: MessagePollBody;

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
    private attachmentService: AttachmentService,
  ) {}

  @Transactional()
  async execute({
    channelId,
    senderId,
    content,
    quotedMessageId,
    markAsScheduled,
    attachmentIds,
    poll,
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
    if (channel.type !== 'workspace_open' && !peerIds.includes(senderId)) {
      throw new SenderIsNotChannelMember();
    }

    const message = await this.messageService.createMessage(
      channel,
      senderId,
      content,
      quotedMessageId,
      { isScheduled: markAsScheduled === true, poll },
    );

    await this.attachmentService.linkStagingToMessage({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      uploadedById: senderId,
      messageId: message.id,
      attachmentIds,
    });

    message.attachments = await this.attachmentService.listAnchoredForMessage(
      channel.workspaceId,
      message.id,
    );

    await dispatchNotificationsForMessageSent(
      this.commandBus,
      channel,
      message,
      senderId,
    );

    return message;
  }
}
