import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRepository } from 'src/auth';
import { patch } from 'src/core/objects';
import { SendNotification } from 'src/notifications/features/send-notification.command';
import { getChannelLabelForNotification } from '../utils/enrich-channel';
import { MessageService } from '../services/message.service';
import { excerptFromTiptapDocWithWorkspaceMembers } from 'src/utils/tiptap-excerpt';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  ChannelRepository,
  MessageRepository,
} from 'src/channel/infrastructure';
import {
  ChannelNotFound,
  IssuerIsNotChannelMember,
  MessageNotFound,
} from '../exceptions';
import { IsNotEmpty, IsString } from 'class-validator';

export class ToggleMessageReaction {
  messageId: number;
  issuerId: number;

  @IsNotEmpty()
  @IsString()
  emoji: string;

  constructor(data: Partial<ToggleMessageReaction>) {
    patch(this, data);
  }
}

@CommandHandler(ToggleMessageReaction)
export class ToggleMessageReactionCommand
  implements ICommandHandler<ToggleMessageReaction>
{
  constructor(
    private messageService: MessageService,
    private workspaceRepo: WorkspaceRepository,
    private messageRepo: MessageRepository,
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private commandBus: CommandBus,
  ) {}

  async execute({ messageId, emoji, issuerId }: ToggleMessageReaction) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: { sender: true },
    });

    if (!message) {
      throw new MessageNotFound();
    }

    const channel = await this.channelRepo.findOne({
      where: { id: message.channelId },
      relations: { peers: true },
    });

    if (!channel) throw new ChannelNotFound();

    if (
      channel.type !== 'workspace_open' &&
      !channel.peers.some((p) => p.id === issuerId)
    ) {
      throw new IssuerIsNotChannelMember();
    }

    const result = await this.messageService.toggleMessageReaction(
      messageId,
      emoji,
      issuerId,
    );

    const reactions = await this.messageService.findMessageReactions(
      messageId,
      issuerId,
    );

    if (
      result.action === 'added' &&
      message.senderId != null &&
      message.senderId !== issuerId
    ) {
      const reactor = await this.userRepo.findOne({ where: { id: issuerId } });
      const reactorDto = reactor
        ? {
            id: reactor.id,
            name: reactor.name,
            email: reactor.email,
            picture: reactor.picture ?? '',
          }
        : {
            id: issuerId,
            name: 'Someone',
            email: '',
            picture: '',
          };
      const channelLabel = getChannelLabelForNotification(
        channel,
        message.senderId,
      );
      const messageExcerpt = await excerptFromTiptapDocWithWorkspaceMembers(
        this.workspaceRepo,
        channel.workspaceId,
        message.content,
      );
      await this.commandBus.execute(
        new SendNotification({
          userIds: [message.senderId],
          type: 'message_reaction',
          workspaceId: channel.workspaceId,
          payload: {
            type: 'message_reaction',
            messageId,
            channelId: channel.id,
            channelName: channelLabel,
            emoji,
            reactorUserId: issuerId,
            reactor: reactorDto,
            messageExcerpt,
          },
        }),
      );
    }

    return {
      success: true,
      channelId: channel.id,
      messageId,
      emoji,
      issuerId,
      action: result.action,
      reactions,
    };
  }
}
