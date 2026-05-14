import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRepository } from 'src/auth';
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
import { ReplyService } from '../services/reply.service';
import { SendNotification } from 'src/notifications/features/send-notification.command';

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
    private replyService: ReplyService,
    private channelRepo: ChannelRepository,
    private messageReplyRepo: MessageReplyRepository,
    private userRepo: UserRepository,
    private commandBus: CommandBus,
  ) {}

  async execute({ replyId, emoji, issuerId }: ToggleReplyReaction) {
    const reply = await this.messageReplyRepo.findOne({
      where: { id: replyId },
      relations: { sender: true },
    });
    if (!reply) throw new MessageReplyNotFound();

    const channel = await this.channelRepo.findOne({
      where: { id: reply.channelId },
      relations: { peers: true },
    });
    if (!channel) throw new ChannelNotFound();

    if (
      channel.type !== 'workspace_open' &&
      !channel.peers.some((p) => p.id === issuerId)
    ) {
      throw new IssuerIsNotChannelMember();
    }

    const result = await this.replyService.toggleReplyReaction(
      replyId,
      emoji,
      issuerId,
    );

    const reactions = await this.replyService.findReplyReactions(
      replyId,
      issuerId,
    );

    if (
      result.action === 'added' &&
      reply.senderId != null &&
      reply.senderId !== issuerId
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
      const channelLabel = this.messageService.getChannelLabelForNotification(
        channel,
        reply.senderId,
      );
      const messageExcerpt =
        await this.replyService.buildReplyExcerptForNotification(
          reply,
          channel,
        );
      await this.commandBus.execute(
        new SendNotification({
          userIds: [reply.senderId],
          type: 'reply_reaction',
          workspaceId: channel.workspaceId,
          payload: {
            type: 'reply_reaction',
            replyId,
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
      replyId,
      emoji,
      issuerId,
      action: result.action,
      reactions,
    };
  }
}
