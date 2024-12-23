import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UserRepository } from 'src/auth';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

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
    private userRepo: UserRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, userId, issuerId }: RemoveChannelMember) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });

    if (!channel) throw new NotFoundException('Channel not found');

    const issuerMember = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );

    if (!issuerMember) throw new IssuerUserIsNotWorkspaceMember();

    const user = await this.userRepo.findOneBy({ id: userId });

    if (!user) throw new NotFoundException('User not found');

    channel.peers = channel.peers.filter((u) => u.id !== userId);

    return this.channelRepo.save(channel);
  }
}
