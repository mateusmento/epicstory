import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ChannelRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';
import type { JSONContent } from '@tiptap/core';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
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
  ChannelNotFound,
  IssuerCanOnlyEditOwnMessages,
  IssuerIsNotChannelMember,
  MessageReplyNotFound,
} from '../exceptions';
import { ReplyService } from '../services/reply.service';

export class UpdateReply {
  replyId: number;
  issuerId: number;

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  constructor(data: Partial<UpdateReply>) {
    patch(this, data);
  }
}

@CommandHandler(UpdateReply)
export class UpdateReplyCommand implements ICommandHandler<UpdateReply> {
  constructor(
    private replyRepo: MessageReplyRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private replyService: ReplyService,
  ) {}

  async execute({ replyId, issuerId, content, attachmentIds }: UpdateReply) {
    const reply = await this.replyRepo.findOne({ where: { id: replyId } });
    if (!reply) throw new MessageReplyNotFound();

    if (reply.senderId !== issuerId) {
      throw new IssuerCanOnlyEditOwnMessages();
    }

    const channel = await this.channelRepo.findOne({
      where: { id: reply.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    // workspace_open: workspace membership is enough (no per-channel peers check)
    if (channel.type !== 'workspace_open') {
      const isChannelMember = (channel.peers ?? []).some(
        (p) => p.id === issuerId,
      );
      if (!isChannelMember) throw new IssuerIsNotChannelMember();
    }

    return this.replyService.updateReplyBody(
      channel,
      replyId,
      content,
      issuerId,
      attachmentIds,
    );
  }
}
