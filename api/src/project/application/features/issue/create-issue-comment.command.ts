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
  IsObject,
  IsOptional,
  Min,
} from 'class-validator';
import { dispatchNotificationsForNewChannelMessage } from 'src/channel/application/utils/dispatch-channel-message-notifications';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { MessageService } from 'src/channel/application/services/message.service';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  IssueActivityRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import type { RichTextDocument } from '@epicstory/tiptap';

export class CreateIssueComment {
  issuer: Issuer;
  issueId: number;

  @IsObject()
  content: RichTextDocument;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  constructor(data: Partial<CreateIssueComment> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateIssueComment)
export class CreateIssueCommentCommand
  implements ICommandHandler<CreateIssueComment>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private messageService: MessageService,
    private issueActivities: IssueActivityRepository,
    private commandBus: CommandBus,
    private attachmentService: AttachmentService,
  ) {}

  @Transactional()
  async execute({
    issuer,
    issueId,
    content,
    attachmentIds,
  }: CreateIssueComment) {
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

    const channel = await this.channelRepo.findOne({
      where: { id: commentChannelId },
      relations: { peers: true },
    });
    if (!channel) throw new ForbiddenException('Comment channel missing');

    const message = await this.messageService.createMessage(
      channel,
      issuer.id,
      content,
      null,
    );

    await this.attachmentService.linkStagingToMessage({
      workspaceId: issue.workspaceId,
      channelId: commentChannelId,
      uploadedById: issuer.id,
      messageId: message.id,
      attachmentIds,
      matchedIssueId: issue.id,
    });

    await this.issueActivities.save(
      this.issueActivities.create({
        issueId: issue.id,
        actorId: issuer.id,
        type: 'comment_created',
        messageId: message.id,
        attachmentId: null,
        payload: {},
      }),
    );

    await dispatchNotificationsForNewChannelMessage(
      this.commandBus,
      channel,
      message,
      issuer.id,
    );

    return message;
  }
}
