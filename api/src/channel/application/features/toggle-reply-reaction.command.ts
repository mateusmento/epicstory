import type { ToggleReactionResponse } from '@epicstory/contracts';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserRepository, userToIUser } from 'src/auth';
import {
  ChannelRepository,
  MessageReplyRepository,
} from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { NotificationService } from 'src/notifications/services/notification.service';
import {
  ChannelNotFound,
  IssuerIsNotChannelMember,
  MessageReplyNotFound,
} from '../exceptions';
import { ReplyService } from '../services/reply.service';
import { getChannelLabelForNotification } from '../utils/enrich-channel';

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
  implements ICommandHandler<ToggleReplyReaction, ToggleReactionResponse>
{
  constructor(
    private replyService: ReplyService,
    private channelRepo: ChannelRepository,
    private messageReplyRepo: MessageReplyRepository,
    private userRepo: UserRepository,
    private notificationService: NotificationService,
  ) {}

  async execute({
    replyId,
    emoji,
    issuerId,
  }: ToggleReplyReaction): Promise<ToggleReactionResponse> {
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
        ? userToIUser(reactor)
        : {
            id: issuerId,
            name: 'Someone',
            email: '',
            picture: '',
          };
      const channelLabel = getChannelLabelForNotification(
        channel,
        reply.senderId,
      );
      const messageExcerpt =
        await this.replyService.buildReplyExcerptForNotification(
          reply,
          channel,
        );

      await this.notificationService.sendNotification({
        userId: reply.senderId,
        type: 'reply_reaction',
        workspaceId: channel.workspaceId,
        payload: {
          replyId,
          channelId: channel.id,
          channelName: channelLabel,
          emoji,
          reactorUserId: issuerId,
          reactor: reactorDto,
          messageExcerpt,
        },
      });
    }

    return {
      success: true,
      channelId: channel.id,
      replyId,
      emoji,
      action: result.action,
      reactions,
    };
  }
}
