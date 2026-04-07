import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { enrichChannelsForListView } from '../utils/channel-list-enrichment';

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
      .leftJoinAndMapOne(
        'c.meeting',
        Meeting,
        'm',
        'm.channel_id = c.id AND m.ongoing = true',
      )
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .where('c.workspaceId = :workspaceId', { workspaceId });

    if (teamId) query = query.andWhere('c.teamId = :teamId', { teamId });

    query = query.orderBy(
      'CASE WHEN msg.id is null THEN c.createdAt ELSE msg.sentAt END',
      'DESC',
    );

    const channels = await query.getMany();
    enrichChannelsForListView(channels, issuer.id);
    return channels;
  }
}
