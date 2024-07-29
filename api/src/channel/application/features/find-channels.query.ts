import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ChannelRepository } from 'src/channel/infrastructure/repositories/channel.repository';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class FindChannels {
  workspaceId: number;
  issuer: Issuer;

  constructor(partial: Partial<FindChannels> = {}) {
    patch(this, partial);
  }
}

@QueryHandler(FindChannels)
export class FindChannelsQuery implements IQueryHandler<FindChannels> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async execute({ issuer, workspaceId }: FindChannels) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    const channels = await this.channelRepo
      .createQueryBuilder('c')
      // .innerJoin('c.peers', 'peer', 'peer.id = :userId', { userId: issuer.id })
      .leftJoinAndSelect('c.peers', 'p')
      .leftJoinAndSelect('c.meeting', 'm')
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .where('c.workspaceId = :workspaceId', { workspaceId })
      .orderBy(
        'CASE WHEN msg.id is null THEN c.createdAt ELSE msg.sentAt END',
        'DESC',
      )
      .getMany();

    for (const channel of channels)
      if (channel.type === 'direct')
        channel.speakingTo = channel.peers.find((p) => p.id !== issuer.id);

    return channels;
  }
}
