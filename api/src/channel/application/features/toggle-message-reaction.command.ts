import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { MessageService } from '../services/message.service';
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
    private messageRepo: MessageRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async execute({ messageId, emoji, issuerId }: ToggleMessageReaction) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new MessageNotFound();
    }

    const channel = await this.channelRepo.findOne({
      where: { id: message.channelId },
      relations: { peers: true },
    });

    if (!channel) throw new ChannelNotFound();

    if (!channel.peers.some((p) => p.id === issuerId))
      throw new IssuerIsNotChannelMember();

    const result = await this.messageService.toggleMessageReaction(
      messageId,
      emoji,
      issuerId,
    );

    const reactions = await this.messageService.findMessageReactions(messageId);

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
