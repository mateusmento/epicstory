import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class FindChannelMembers {
  channelId: number;
  issuerId: number;

  constructor(data: Partial<FindChannelMembers>) {
    patch(this, data);
  }
}

@QueryHandler(FindChannelMembers)
export class FindChannelMembersQuery
  implements IQueryHandler<FindChannelMembers>
{
  constructor(
    private channelRepo: ChannelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ channelId, issuerId }: FindChannelMembers) {
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
