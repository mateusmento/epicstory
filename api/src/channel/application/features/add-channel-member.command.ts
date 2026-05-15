import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { UserRepository } from 'src/auth';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { ChannelActivityService } from '../services/channel-activity.service';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class AddChannelMember {
  channelId: number;
  issuerId: number;
  @IsNumber()
  userId: number;

  constructor(data: Partial<AddChannelMember> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AddChannelMember)
export class AddChannelMemberCommand
  implements ICommandHandler<AddChannelMember>
{
  constructor(
    private channelRepo: ChannelRepository,
    private userRepo: UserRepository,
    private workspaceRepo: WorkspaceRepository,
    private channelActivityService: ChannelActivityService,
  ) {}

  async execute({ channelId, userId, issuerId }: AddChannelMember) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });

    if (!channel) throw new NotFoundException('Channel not found');

    await this.workspaceRepo.requiresMembership(channel.workspaceId, issuerId);

    const member = await this.workspaceRepo.requiresMembership(
      channel.workspaceId,
      userId,
      { user: true },
    );

    channel.peers.push(member.user);

    const saved = await this.channelRepo.save(channel);

    await this.channelActivityService.publishUserAdded({
      channelId,
      actorId: issuerId,
      subjectUserId: userId,
    });

    return saved;
  }
}
