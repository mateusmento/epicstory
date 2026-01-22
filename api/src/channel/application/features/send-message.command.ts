import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserRepository } from 'src/auth';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { MessageGateway } from '../gateways/message.gateway';
import { MessageService } from '../services/message.service';
import { ChannelNotFound } from '../exceptions';

export class SendMessage {
  channelId: number;
  senderId: number;

  @IsNotEmpty()
  @IsString()
  content: string;

  constructor(data: Partial<SendMessage>) {
    patch(this, data);
  }
}

@CommandHandler(SendMessage)
export class SendMessageCommand implements ICommandHandler<SendMessage> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private messageRepo: MessageRepository,
    private messageService: MessageService,
    private userRepo: UserRepository,
    private messageGateway: MessageGateway,
  ) {}

  async execute({ channelId, senderId, content }: SendMessage) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
    });
    if (!channel) {
      throw new ChannelNotFound();
    }

    const senderMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      senderId,
    );
    if (!senderMember) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const { id } = await this.messageService.createMessage(
      content,
      channelId,
      senderId,
    );

    const message = await this.messageRepo.findOne({
      where: { id },
      relations: { sender: true },
    });

    return message;
  }
}
