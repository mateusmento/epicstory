import type { JSONContent } from '@tiptap/core';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { attachmentUploadMulterOptions } from 'src/core/multer/attachment-upload-options';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  UpdateIssue,
  RemoveIssue,
  AddAssignee,
  RemoveAssignee,
  AddLabel,
  RemoveLabel,
  CreateIssueComment,
  ReplyToIssueComment,
} from '../features';
import { FindIssue } from '../features/issue/find-issue.query';
import { FindIssueFeed } from '../features/issue/find-issue-feed.query';

@Controller('issues')
export class IssueController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
    private issues: IssueRepository,
    private attachments: AttachmentService,
    private workspaces: WorkspaceRepository,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findIssue(@Param('id') issueId: number) {
    return this.queryBus.execute(new FindIssue({ issueId }));
  }

  @Get(':id/feed')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  findIssueFeed(
    @Param('id') issueId: number,
    @Query('limit') limit: string | undefined,
    @Auth() issuer,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.queryBus.execute(
      new FindIssueFeed({
        issueId,
        issuer,
        limit:
          parsed !== undefined && Number.isFinite(parsed)
            ? Math.floor(parsed)
            : undefined,
      }),
    );
  }

  @Post(':id/comments/:parentMessageId/replies')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  replyToIssueComment(
    @Param('id') issueId: number,
    @Param('parentMessageId') parentMessageId: number,
    @Body()
    body: {
      content: string;
      contentRich?: JSONContent;
      attachmentIds?: number[];
    },
    @Auth() issuer,
  ) {
    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      throw new BadRequestException('Content is required');
    }
    return this.commandBus.execute(
      new ReplyToIssueComment({
        issueId,
        parentMessageId,
        issuer,
        content: body.content,
        contentRich: body.contentRich,
        attachmentIds: body.attachmentIds,
      }),
    );
  }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  createIssueComment(
    @Param('id') issueId: number,
    @Body()
    body: {
      content: string;
      contentRich?: JSONContent;
      attachmentIds?: number[];
    },
    @Auth() issuer,
  ) {
    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      throw new BadRequestException('Content is required');
    }
    return this.commandBus.execute(
      new CreateIssueComment({
        issueId,
        issuer,
        content: body.content,
        contentRich: body.contentRich,
        attachmentIds: body.attachmentIds,
      }),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  updateIssue(
    @Param('id') issueId: number,
    @Body() data: UpdateIssue,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateIssue({ ...data, issueId, issuer }),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  removeIssue(@Param('id') issueId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new RemoveIssue({ issueId, issuer }));
  }

  @Post(':id/assignees')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  addAssignee(
    @Param('id') issueId: number,
    @Body() data: AddAssignee,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new AddAssignee({ ...data, issueId, issuer }),
    );
  }

  @Delete(':id/assignees/:userId')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  removeAssignee(
    @Param('id') issueId: number,
    @Param('userId') userId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveAssignee({ issueId, userId, issuer }),
    );
  }

  @Post(':id/labels')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  addLabel(
    @Param('id') issueId: number,
    @Body() data: AddLabel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(new AddLabel({ ...data, issueId, issuer }));
  }

  @Delete(':id/labels/:labelId')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  removeLabel(
    @Param('id') issueId: number,
    @Param('labelId') labelId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveLabel({ issueId, labelId, issuer }),
    );
  }

  @Get(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listIssueAttachments(
    @Param('id') issueId: number,
    @Auth() issuer: Issuer,
  ) {
    const issue = await this.issues.findOne({ where: { id: issueId } });
    if (!issue) throw new ForbiddenException('Issue not found');
    await this.workspaces.requiresMembership(issue.workspaceId, issuer.id);
    return this.attachments.listForIssue(
      issue.workspaceId,
      issueId,
      100,
      issue.commentChannelId ?? null,
    );
  }

  @Post(':id/attachments')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', attachmentUploadMulterOptions))
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async uploadIssueAttachment(
    @Param('id') issueId: number,
    @UploadedFile() file: Express.Multer.File,
    @Auth() issuer: Issuer,
  ) {
    const issue = await this.issues.findOne({ where: { id: issueId } });
    if (!issue) throw new ForbiddenException('Issue not found');
    await this.workspaces.requiresMembership(issue.workspaceId, issuer.id);
    if (!file || file.size === 0) {
      throw new BadRequestException('Missing file');
    }
    return this.attachments.createFromUpload({
      workspaceId: issue.workspaceId,
      issueId,
      uploadedById: issuer.id,
      file,
    });
  }
}
