import type { JSONContent } from '@tiptap/core';
import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
import { ReplyService } from 'src/channel/application/services/reply.service';
import { dispatchNotificationsForReplySent } from 'src/channel/application/utils/dispatch-reply-notifications';
import { MessageRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class ReplyToIssueComment {
  issuer!: Issuer;
  issueId!: number;
  parentMessageId!: number;

  @IsNotEmpty()
  @IsObject()
  content!: JSONContent;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  constructor(data: Partial<ReplyToIssueComment> = {}) {
    patch(this, data);
  }
}

@CommandHandler(ReplyToIssueComment)
export class ReplyToIssueCommentCommand
  implements ICommandHandler<ReplyToIssueComment>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private messageRepo: MessageRepository,
    private replyService: ReplyService,
    private attachmentService: AttachmentService,
    private commandBus: CommandBus,
  ) {}

  @Transactional()
  async execute({
    issuer,
    issueId,
    parentMessageId,
    content,
    attachmentIds,
  }: ReplyToIssueComment) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const commentChannelId = issue.commentChannelId;
    if (commentChannelId == null) {
      throw new UnprocessableEntityException(
        'Issue comment thread is not ready',
      );
    }

    const threadRoot = await this.messageRepo.findOne({
      where: { id: parentMessageId },
    });
    if (!threadRoot) throw new NotFoundException('Comment not found');
    if (threadRoot.channelId !== commentChannelId) {
      throw new ForbiddenException('Comment is not part of this issue thread');
    }

    const { reply, parentMessage } = await this.replyService.createReply({
      messageId: parentMessageId,
      senderId: issuer.id,
      content,
    });

    const channel = parentMessage.channel;

    await this.attachmentService.linkStagingToReply({
      workspaceId: issue.workspaceId,
      channelId: commentChannelId,
      uploadedById: issuer.id,
      messageReplyId: reply.id,
      attachmentIds,
      matchedIssueId: issue.id,
    });

    reply.attachments = await this.attachmentService.listAnchoredForReply(
      issue.workspaceId,
      reply.id,
    );

    await dispatchNotificationsForReplySent(
      this.commandBus,
      channel,
      parentMessage,
      reply,
      issuer.id,
    );

    return reply;
  }
}
