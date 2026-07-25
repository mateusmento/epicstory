import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type { JSONContent } from '@tiptap/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { MessagePollBody } from '../dtos/message-poll.dto';
import { ChannelNotFound, IssuerIsNotChannelMember } from '../exceptions';
import { MessageDraftService } from '../services/message-draft.service';

class UpsertDraftBody {
  @IsObject()
  content: JSONContent;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @ValidateNested()
  @Type(() => MessagePollBody)
  poll?: MessagePollBody | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedMessageId?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  quotedReplyId?: number | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  attachmentIds?: number[];

  /** Current known version; use 0 when creating. */
  @IsOptional()
  @IsInt()
  @Min(0)
  version?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/drafts')
export class ChannelMessageDraftController {
  constructor(
    private readonly drafts: MessageDraftService,
    private readonly channels: ChannelRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  @Get()
  async get(
    @Param('channelId') channelId: number,
    @Auth() issuer: Issuer,
    @Query('threadMessageId') threadMessageId?: string,
  ) {
    const channel = await this.assertChannelAccess(channelId, issuer.id);
    const thread =
      threadMessageId != null && threadMessageId !== ''
        ? +threadMessageId
        : null;
    const draft = await this.drafts.getOrNull({
      channelId: channel.id,
      authorId: issuer.id,
      threadMessageId: thread,
    });
    return draft;
  }

  @Put()
  async upsert(
    @Param('channelId') channelId: number,
    @Body() body: UpsertDraftBody,
    @Auth() issuer: Issuer,
    @Query('threadMessageId') threadMessageId?: string,
  ) {
    const channel = await this.assertChannelAccess(channelId, issuer.id);
    const thread =
      threadMessageId != null && threadMessageId !== ''
        ? +threadMessageId
        : null;
    const result = await this.drafts.upsert({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      authorId: issuer.id,
      threadMessageId: thread,
      content: body.content,
      poll: body.poll,
      quotedMessageId: body.quotedMessageId,
      quotedReplyId: body.quotedReplyId,
      attachmentIds: body.attachmentIds,
      version: body.version,
    });
    if (result.ok === false) {
      throw new ConflictException({
        message: 'Draft version conflict',
        draft: result.conflict,
      });
    }
    return result.draft;
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('channelId') channelId: number,
    @Auth() issuer: Issuer,
    @Query('threadMessageId') threadMessageId?: string,
    @Query('version') version?: string,
  ) {
    await this.assertChannelAccess(channelId, issuer.id);
    const thread =
      threadMessageId != null && threadMessageId !== ''
        ? +threadMessageId
        : null;
    const result = await this.drafts.delete({
      channelId,
      authorId: issuer.id,
      threadMessageId: thread,
      version: version != null && version !== '' ? +version : undefined,
    });
    if (result.ok === false) {
      if (result.reason === 'not_found') {
        throw new NotFoundException('Draft not found');
      }
      throw new ConflictException({
        message: 'Draft version conflict',
        draft: result.conflict,
      });
    }
  }

  private async assertChannelAccess(channelId: number, issuerId: number) {
    const channel = await this.channels.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();
    const member = await this.workspaces.findMember(
      channel.workspaceId,
      issuerId,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (
      channel.type !== 'workspace_open' &&
      !channel.peers?.some((p) => p.id === issuerId)
    ) {
      throw new IssuerIsNotChannelMember();
    }
    return channel;
  }
}

@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/message-drafts')
export class WorkspaceMessageDraftController {
  constructor(
    private readonly drafts: MessageDraftService,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  @Get()
  async list(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const member = await this.workspaces.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return this.drafts.listForAuthor({
      workspaceId,
      authorId: issuer.id,
    });
  }

  @Get('count')
  async count(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const member = await this.workspaces.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    const count = await this.drafts.countForAuthor({
      workspaceId,
      authorId: issuer.id,
    });
    return { count };
  }
}
