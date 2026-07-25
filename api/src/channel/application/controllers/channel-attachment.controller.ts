import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { attachmentUploadMulterOptions } from 'src/core/multer/attachment-upload-options';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { Attachment } from 'src/workspace/domain/entities/attachment.entity';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound, IssuerIsNotChannelMember } from '../exceptions';
import { AttachmentReferencesService } from '../services/attachment-references.service';
import { MessageDraftService } from '../services/message-draft.service';

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/attachments')
export class ChannelAttachmentController {
  constructor(
    private readonly attachments: AttachmentService,
    private readonly attachmentRefs: AttachmentReferencesService,
    private readonly drafts: MessageDraftService,
    private readonly channels: ChannelRepository,
    private readonly workspaces: WorkspaceRepository,
    @InjectRepository(Attachment)
    private readonly attachmentRows: Repository<Attachment>,
  ) {}

  @Get()
  async list(@Param('channelId') channelId: number, @Auth() issuer: Issuer) {
    const channel = await this.requireChannelMember(channelId, issuer.id);
    return this.attachmentRefs.listDeliveredForChannel(
      channel.workspaceId,
      channelId,
    );
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', attachmentUploadMulterOptions))
  async upload(
    @Param('channelId') channelId: number,
    @UploadedFile() file: Express.Multer.File,
    @Auth() issuer: Issuer,
    @Query('threadMessageId') threadMessageId?: string,
  ) {
    const channel = await this.requireChannelMember(channelId, issuer.id);
    if (!file || file.size === 0) {
      throw new BadRequestException('Missing file');
    }

    const thread =
      threadMessageId != null && threadMessageId !== ''
        ? +threadMessageId
        : null;

    const draft = await this.drafts.ensureDraft({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      authorId: issuer.id,
      threadMessageId: thread,
    });

    const uploaded = await this.attachments.createFromUpload({
      workspaceId: channel.workspaceId,
      channelId,
      uploadedById: issuer.id,
      file,
    });

    const desiredIds = [
      ...new Set([...draft.attachments.map((a) => a.id), uploaded.id]),
    ];
    await this.attachmentRefs.commit({
      workspaceId: channel.workspaceId,
      channelId: channel.id,
      actor: { uploadedById: issuer.id },
      ops: [
        {
          op: 'sync',
          anchor: { type: 'draft', draftId: draft.id },
          attachmentIds: desiredIds,
        },
      ],
    });

    return uploaded;
  }

  @Delete(':attachmentId')
  async delete(
    @Param('channelId') channelId: number,
    @Param('attachmentId') attachmentId: number,
    @Auth() issuer: Issuer,
  ) {
    const channel = await this.requireChannelMember(channelId, issuer.id);
    const row = await this.attachmentRows.findOne({
      where: { id: attachmentId, workspaceId: channel.workspaceId },
    });
    if (!row || row.channelId !== channelId) {
      throw new NotFoundException('Attachment not found');
    }
    if (row.uploadedById !== issuer.id) {
      throw new ForbiddenException(
        'You can only remove attachments you uploaded',
      );
    }

    await this.attachmentRefs.commit({
      workspaceId: channel.workspaceId,
      channelId,
      actor: { uploadedById: issuer.id, trustedDelivery: true },
      ops: [{ op: 'releaseAttachment', attachmentId }],
    });
  }

  private async requireChannelMember(channelId: number, issuerId: number) {
    const channel = await this.channels.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) {
      throw new ChannelNotFound();
    }
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
