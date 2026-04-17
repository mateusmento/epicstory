import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import {
  ChannelNotFound,
  IssuerCanOnlyEditOwnMessages,
  IssuerIsNotChannelMember,
  MessageNotFound,
} from '../exceptions';
import { MessageService } from '../services/message.service';

export class UpdateMessage {
  messageId: number;
  issuerId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  contentRich?: any;

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

  async execute({ messageId, issuerId, content, contentRich }: UpdateMessage) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });
    if (!message) throw new MessageNotFound();
    if (message.senderId !== issuerId) {
      throw new IssuerCanOnlyEditOwnMessages();
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

    const isChannelMember = (channel.peers ?? []).some(
      (p) => p.id === issuerId,
    );
    if (!isChannelMember) throw new IssuerIsNotChannelMember();

    return this.messageService.updateMessageBody(
      channel,
      messageId,
      content,
      contentRich,
      issuerId,
    );
  }
}
