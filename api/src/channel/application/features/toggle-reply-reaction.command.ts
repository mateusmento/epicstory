import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  ChannelRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import {
  ChannelNotFound,
  IssuerIsNotChannelMember,
  MessageReplyNotFound,
} from '../exceptions';
import { MessageService } from '../services/message.service';

export class ToggleReplyReaction {
  replyId: number;
  issuerId: number;

  @IsNotEmpty()
  @IsString()
  emoji: string;

  constructor(data: Partial<ToggleReplyReaction>) {
    patch(this, data);
  }
}

@CommandHandler(ToggleReplyReaction)
export class ToggleReplyReactionCommand
  implements ICommandHandler<ToggleReplyReaction>
{
  constructor(
    private messageService: MessageService,
    private channelRepo: ChannelRepository,
    private messageReplyRepo: MessageReplyRepository,
  ) {}

  async execute({ replyId, emoji, issuerId }: ToggleReplyReaction) {
    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
    });
    if (!reply) throw new MessageReplyNotFound();

    const channel = await this.channelRepo.findOne({
      where: { id: reply.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    if (!channel.peers.some((p) => p.id === issuerId))
      throw new IssuerIsNotChannelMember();

    const result = await this.messageService.toggleReplyReaction(
      replyId,
      emoji,
      issuerId,
    );

    const reactions = await this.messageService.findReplyReactions(
      replyId,
      issuerId,
    );

    return {
      success: true,
      channelId: channel.id,
      replyId,
      emoji,
      issuerId,
      action: result.action,
      reactions,
    };
  }
}
