import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ChannelRepository,
  MessageRepository,
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
  MessageNotFound,
  ScheduledMessageCannotBeEdited,
} from '../exceptions';
import { MessageService } from '../services/message.service';

export class UpdateMessage {
  messageId: number;
  issuerId: number;

  @IsNotEmpty()
  @IsObject()
  content: JSONContent;

  /** Staged uploads to bind when saving edits (same rules as send). */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @Min(1, { each: true })
  attachmentIds?: number[];

  constructor(data: Partial<UpdateMessage>) {
    patch(this, data);
  }
}

@CommandHandler(UpdateMessage)
export class UpdateMessageCommand implements ICommandHandler<UpdateMessage> {
  constructor(
    private messageRepo: MessageRepository,
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
    private messageService: MessageService,
  ) {}

  async execute({
    messageId,
    issuerId,
    content,
    attachmentIds,
  }: UpdateMessage) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new MessageNotFound();
    if (message.senderId !== issuerId) {
      throw new IssuerCanOnlyEditOwnMessages();
    }
    if (message.isScheduled) {
      throw new ScheduledMessageCannotBeEdited();
    }

    const channel = await this.channelRepo.findOne({
      where: { id: message.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );
    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const isWorkspaceOpen = channel.type === 'workspace_open';
    if (!isWorkspaceOpen) {
      const isChannelMember = (channel.peers ?? []).some(
        (p) => p.id === issuerId,
      );
      if (!isChannelMember) throw new IssuerIsNotChannelMember();
    }

    return this.messageService.updateMessageBody(
      channel,
      messageId,
      content,
      issuerId,
      attachmentIds,
    );
  }
}
