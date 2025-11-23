import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class FindChannels {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

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

  async execute({ issuer, workspaceId, teamId }: FindChannels) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    let query = this.channelRepo
      .createQueryBuilder('c')
      .innerJoin('c.peers', 'peer', 'peer.id = :userId', { userId: issuer.id })
      .leftJoinAndSelect('c.peers', 'p')
      .leftJoinAndSelect('c.meeting', 'm')
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .where('c.workspaceId = :workspaceId', { workspaceId });

    if (teamId) query = query.where('c.teamId = :teamId', { teamId });

    query = query.orderBy(
      'CASE WHEN msg.id is null THEN c.createdAt ELSE msg.sentAt END',
      'DESC',
    );

    const channels = await query.getMany();

    for (const channel of channels)
      if (channel.type === 'direct')
        channel.speakingTo = channel.peers.find((p) => p.id !== issuer.id);

    return channels;
  }
}
