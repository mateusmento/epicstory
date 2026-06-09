import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import { MessageRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { MessageNotFound, SenderIsNotChannelMember } from '../exceptions';
import { ReplyService } from '../services/reply.service';
import type { JSONContent } from '@tiptap/core';
import { dispatchNotificationsForReplySent } from '../utils/dispatch-reply-notifications';
import { Transactional } from 'typeorm-transactional';

export class ReplyMessage {
  messageId: number;
  senderId: number;

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedReplyId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  constructor(data: Partial<ReplyMessage> = {}) {
    patch(this, data);
  }
}

@CommandHandler(ReplyMessage)
export class ReplyMessageCommand implements ICommandHandler<ReplyMessage> {
  constructor(
    private messageRepo: MessageRepository,
    private replyService: ReplyService,
    private commandBus: CommandBus,
    private attachmentService: AttachmentService,
  ) {}

  @Transactional()
  async execute({
    senderId,
    content,
    messageId,
    quotedReplyId,
    attachmentIds,
  }: ReplyMessage) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { channel: { peers: true } },
    });
    if (!message) throw new MessageNotFound();

    const peerIds = message.channel.peers.map((peer) => peer.id);
    if (
      message.channel.type !== 'workspace_open' &&
      !peerIds.includes(senderId)
    ) {
      throw new SenderIsNotChannelMember();
    }

    const { reply, parentMessage } = await this.replyService.createReply({
      messageId,
      senderId,
      content,
      quotedReplyId,
    });

    const channel = parentMessage.channel;

    await this.attachmentService.linkStagingToReply({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      uploadedById: senderId,
      messageReplyId: reply.id,
      attachmentIds,
    });

    reply.attachments = await this.attachmentService.listAnchoredForReply(
      channel.workspaceId,
      reply.id,
    );

    await dispatchNotificationsForReplySent(
      this.commandBus,
      channel,
      parentMessage,
      reply,
      senderId,
    );

    return reply;
  }
}
