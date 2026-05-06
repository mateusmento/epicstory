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
  IsString,
  Min,
} from 'class-validator';
import { ReplyMessage } from 'src/channel/application/features';
import { MessageRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class ReplyToIssueComment {
  issuer!: Issuer;
  issueId!: number;
  parentMessageId!: number;

  @IsNotEmpty()
  @IsString()
  content!: string;

  @IsOptional()
  @IsObject()
  contentRich?: JSONContent;

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
    private commandBus: CommandBus,
  ) {}

  @Transactional()
  async execute({
    issuer,
    issueId,
    parentMessageId,
    content,
    contentRich,
    attachmentIds,
  }: ReplyToIssueComment) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))) {
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
      throw new ForbiddenException(
        'Comment is not part of this issue thread',
      );
    }

    return this.commandBus.execute(
      new ReplyMessage({
        messageId: parentMessageId,
        senderId: issuer.id,
        content,
        contentRich,
        quotedReplyId: undefined,
        attachmentIds,
        matchedIssueId: issue.id,
      }),
    );
  }
}
