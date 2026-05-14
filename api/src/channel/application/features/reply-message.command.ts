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
import {
  MessageReplyRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { uniq } from 'lodash';
import { patch } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { SendNotification } from 'src/notifications/features/send-notification.command';
import { MessageNotFound, SenderIsNotChannelMember } from '../exceptions';
import { ChannelMentionsService } from '../services/channel-mentions.service';
import { ReplyService } from '../services/reply.service';
import type { JSONContent } from '@tiptap/core';
import {
  enrichMentionLabels,
  extractMentionIds,
  normalizeTiptapDoc,
  tiptapDocToPlainDisplayText,
} from '@epicstory/tiptap';
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

  /** When replying in an issue comment thread, staged rows may be tagged with this issue. */
  @IsOptional()
  @IsInt()
  @Min(1)
  matchedIssueId?: number;

  constructor(data: Partial<ReplyMessage> = {}) {
    patch(this, data);
  }
}

@CommandHandler(ReplyMessage)
export class ReplyMessageCommand implements ICommandHandler<ReplyMessage> {
  constructor(
    private messageReplyRepo: MessageReplyRepository,
    private messageRepo: MessageRepository,
    private replyService: ReplyService,
    private channelMentions: ChannelMentionsService,
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
    matchedIssueId,
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

    const normalizedContent = normalizeTiptapDoc(content);

    const resolvedQuote = await this.replyService.resolveQuotedReplyId(
      quotedReplyId,
      messageId,
      message.channelId,
    );

    const { id: replyId } = await this.messageReplyRepo.save({
      content: normalizedContent,
      channelId: message.channelId,
      messageId,
      senderId,
      sentAt: new Date(),
      quotedReplyId: resolvedQuote,
    });

    await this.attachmentService.linkStagingToReply({
      workspaceId: message.channel.workspaceId,
      channelId: message.channelId,
      uploadedById: senderId,
      messageReplyId: replyId,
      attachmentIds,
      ...(matchedIssueId != null ? { matchedIssueId } : {}),
    });

    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
      relations: { sender: true, allReactions: { user: true } },
    });

    reply.setReactions(senderId);

    const extractedMentionIds = extractMentionIds(normalizedContent);
    const peerUsersMap = await this.channelMentions.resolveMentionUsersMap(
      message.channel,
      uniq(extractedMentionIds),
    );
    const finalMentionIds = extractedMentionIds.filter(
      (id) => id !== senderId && peerUsersMap.has(id),
    );
    const mentionedUsers = finalMentionIds
      .map((id) => peerUsersMap.get(id))
      .filter(Boolean);
    const displayContent = tiptapDocToPlainDisplayText(
      enrichMentionLabels(normalizedContent, peerUsersMap),
    );

    (reply as any).mentionedUsers = mentionedUsers;
    (reply as any).displayContent = displayContent;

    if (resolvedQuote) {
      const q = await this.messageReplyRepo.findOne({
        where: { id: resolvedQuote },
        relations: { sender: true },
      });
      (reply as any).quotedMessage =
        this.replyService.buildQuotedPreviewFromReply(q, peerUsersMap);
    }

    if (finalMentionIds.length > 0) {
      await this.commandBus.execute(
        new SendNotification({
          type: 'mention',
          userIds: finalMentionIds,
          workspaceId: message.channel.workspaceId,
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
          workspaceId: message.channel.workspaceId,
          payload: {
            reply,
            message,
            channel: message.channel,
            sender: reply.sender,
          },
        }),
      );
    }

    (reply as any).attachments =
      await this.attachmentService.listAnchoredForReply(
        message.channel.workspaceId,
        reply.id,
      );

    return reply;
  }
}
