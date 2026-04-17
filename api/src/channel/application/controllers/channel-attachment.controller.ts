import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { attachmentUploadMulterOptions } from 'src/core/multer/attachment-upload-options';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { ChannelNotFound, IssuerIsNotChannelMember } from '../exceptions';

@UseGuards(JwtAuthGuard)
@Controller('channels/:channelId/attachments')
export class ChannelAttachmentController {
  constructor(
    private readonly attachments: AttachmentService,
    private readonly channels: ChannelRepository,
    private readonly workspaces: WorkspaceRepository,
  ) {}

  @Get()
  async list(@Param('channelId') channelId: number, @Auth() issuer: Issuer) {
    const channel = await this.channels.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) {
      throw new ChannelNotFound();
    }
    const member = await this.workspaces.findMember(
      channel.workspaceId,
      issuer.id,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (!channel.peers?.some((p) => p.id === issuer.id)) {
      throw new IssuerIsNotChannelMember();
    }
    return this.attachments.listForChannel(channel.workspaceId, channelId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', attachmentUploadMulterOptions))
  async upload(
    @Param('channelId') channelId: number,
    @UploadedFile() file: Express.Multer.File,
    @Auth() issuer: Issuer,
  ) {
    const channel = await this.channels.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });
    if (!channel) {
      throw new ChannelNotFound();
    }
    const member = await this.workspaces.findMember(
      channel.workspaceId,
      issuer.id,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (!channel.peers?.some((p) => p.id === issuer.id)) {
      throw new IssuerIsNotChannelMember();
    }
    if (!file || file.size === 0) {
      throw new BadRequestException('Missing file');
    }
    return this.attachments.createFromUpload({
      workspaceId: channel.workspaceId,
      channelId,
      uploadedById: issuer.id,
      file,
    });
  }
}
