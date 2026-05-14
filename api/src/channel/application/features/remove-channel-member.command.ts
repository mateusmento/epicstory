import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { enrichChannelForPreview } from '../utils/enrich-channel';

export class RemoveChannelMember {
  channelId: number;
  issuerId: number;
  userId: number;

  constructor(data: Partial<RemoveChannelMember> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveChannelMember)
export class RemoveChannelMemberCommand
  implements ICommandHandler<RemoveChannelMember>
{
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, userId, issuerId }: RemoveChannelMember) {
    let channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });

    if (!channel) throw new NotFoundException('Channel not found');

    await this.workspaceRepo.requiresMembership(channel.workspaceId, issuerId);
    await this.workspaceRepo.requiresMembership(channel.workspaceId, userId);

    channel.peers = channel.peers.filter((u) => u.id !== userId);

    channel = await this.channelRepo.save(channel);
    return enrichChannelForPreview(channel, issuerId);
  }
}
