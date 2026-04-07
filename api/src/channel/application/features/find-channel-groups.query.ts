import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { Issuer } from 'src/core/auth';
import { Page } from 'src/core/page';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { enrichChannelsForListView } from '../utils/channel-list-enrichment';

export type ChannelGroupsPage = {
  groupChannels: Page<Channel>;
  meetingChannels: Page<Channel>;
  directChannels: Page<Channel>;
};

export class FindChannelGroups {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupPage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  meetingPage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  directPage?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number;

  constructor(partial: Partial<FindChannelGroups> = {}) {
    patch(this, partial);
  }
}

@QueryHandler(FindChannelGroups)
export class FindChannelGroupsQuery
  implements IQueryHandler<FindChannelGroups, ChannelGroupsPage>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
  ) {}

  async execute(query: FindChannelGroups): Promise<ChannelGroupsPage> {
    const member = await this.workspaceRepo.findMember(
      query.workspaceId,
      query.issuer.id,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    const count = query.count ?? 20;

    const [groupChannels, meetingChannels, directChannels] = await Promise.all([
      this.fetchChannelPage({
        workspaceId: query.workspaceId,
        issuerId: query.issuer.id,
        teamId: query.teamId,
        types: ['group'],
        page: query.groupPage ?? 1,
        count,
      }),
      this.fetchChannelPage({
        workspaceId: query.workspaceId,
        issuerId: query.issuer.id,
        teamId: query.teamId,
        types: ['meeting'],
        page: query.meetingPage ?? 1,
        count,
      }),
      this.fetchChannelPage({
        workspaceId: query.workspaceId,
        issuerId: query.issuer.id,
        teamId: query.teamId,
        types: ['direct', 'multi-direct'],
        page: query.directPage ?? 1,
        count,
      }),
    ]);

    return { groupChannels, meetingChannels, directChannels };
  }

  private async fetchChannelPage({
    workspaceId,
    issuerId,
    teamId,
    types,
    page,
    count,
  }: {
    workspaceId: number;
    issuerId: number;
    teamId?: number;
    types: Channel['type'][];
    page: number;
    count: number;
  }): Promise<Page<Channel>> {
    const safeCount = Math.min(50, Math.max(1, Math.floor(Number(count))));
    const safePage = Math.max(1, Math.floor(Number(page)));
    const offset = (safePage - 1) * safeCount;

    let base = this.channelRepo
      .createQueryBuilder('c')
      .leftJoin('c.lastMessage', 'msg')
      .where('c.workspaceId = :workspaceId', { workspaceId })
      .andWhere('c.type IN (:...types)', { types })
      // Avoid join duplication (which would require DISTINCT + ORDER BY restrictions in Postgres).
      // Channel membership is represented by channel.channel_peers.
      .andWhere(
        `EXISTS (
          SELECT 1
          FROM "channel"."channel_peers" cp
          WHERE cp.channel_id = c.id AND cp.users_id = :userId
        )`,
        { userId: issuerId },
      );

    if (teamId !== undefined) {
      base = base.andWhere('c.teamId = :teamId', { teamId });
    }

    const countRaw = await base
      .clone()
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string | number }>();
    const total = Number(countRaw?.cnt ?? 0);

    const idRows = await base
      .clone()
      .select('c.id', 'id')
      .orderBy(
        'CASE WHEN msg.id is null THEN c.createdAt ELSE msg.sentAt END',
        'DESC',
      )
      .addOrderBy('c.id', 'DESC')
      .limit(safeCount)
      .offset(offset)
      .getRawMany<{ id: number }>();

    const ids = idRows.map((r) => Number(r.id)).filter(Boolean);
    if (ids.length === 0) {
      return Page.fromResult([], total, { page: safePage, count: safeCount });
    }

    const channels = await this.channelRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.peers', 'p')
      .leftJoinAndMapOne(
        'c.meeting',
        Meeting,
        'm',
        'm.channel_id = c.id AND m.ongoing = true',
      )
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .where('c.id IN (:...ids)', { ids })
      .getMany();

    enrichChannelsForListView(channels, issuerId);

    const byId = new Map<number, Channel>(channels.map((c) => [c.id, c]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean) as Channel[];

    return Page.fromResult(ordered, total, {
      page: safePage,
      count: safeCount,
    });
  }
}
