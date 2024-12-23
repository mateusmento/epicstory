import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class FindChannel {
  channelId: number;
  issuerId: number;

  constructor(data: Partial<FindChannel>) {
    patch(this, data);
  }
}

@QueryHandler(FindChannel)
export class FindChannelQuery implements IQueryHandler<FindChannel> {
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, issuerId }: FindChannel) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: {
        peers: true,
        lastMessage: true,
        meeting: true,
      },
    });

    if (!channel) throw new NotFoundException('Channel not found');

    const issuer = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );

    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    if (channel.type === 'direct')
      channel.speakingTo = channel.peers.find((p) => p.id !== issuer.id);

    return channel;
  }
}
