import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class FindChannelPeers {
  channelId: number;
  issuerId: number;

  constructor(data: Partial<FindChannelPeers>) {
    patch(this, data);
  }
}

@QueryHandler(FindChannelPeers)
export class FindChannelPeersQuery implements IQueryHandler<FindChannelPeers> {
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, issuerId }: FindChannelPeers) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId },
      relations: { peers: true },
    });

    if (!channel) throw new NotFoundException('Channel not found');

    const issuer = await this.workspaceRepo.findMember(
      channel.workspaceId,
      issuerId,
    );

    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    return channel.peers;
  }
}
