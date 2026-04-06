import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { User } from 'src/auth';
import { UserRepository } from 'src/auth/infrastructure/repositories/user.repository';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { Meeting } from 'src/channel/domain/entities/meeting.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { enrichChannelsForListView } from 'src/channel/application/utils/channel-list-enrichment';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceMemberRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { In } from 'typeorm';
import {
  createDirectMessageCandidatesUnionSelect,
  createMemberChannelsUnionSelect,
  type ChannelUserSearchScope,
} from './search-channels-and-users.subqueries';
import {
  executeUnionCountAndPage,
  mergeUnionFragments,
  searchUnionKind,
  type SearchUnionRow,
} from './search-channels-and-users.union';

export type SearchChannelsAndUsersItem =
  | { kind: 'channel'; channel: Channel }
  | { kind: 'user'; user: User };

export class SearchChannelsAndUsers {
  workspaceId: number;
  issuer: Issuer;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  constructor(partial: Partial<SearchChannelsAndUsers> = {}) {
    patch(this, partial);
  }
}

@QueryHandler(SearchChannelsAndUsers)
export class SearchChannelsAndUsersQuery
  implements IQueryHandler<SearchChannelsAndUsers>
{
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private channelRepo: ChannelRepository,
    private workspaceMemberRepo: WorkspaceMemberRepository,
    private userRepo: UserRepository,
  ) {}

  async execute(query: SearchChannelsAndUsers) {
    const { issuer, workspaceId, teamId } = query;
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const qTrim = query.q?.trim() ?? '';

    const scope: ChannelUserSearchScope = {
      issuerId: Math.floor(Number(issuer.id)),
      workspaceId: Math.floor(Number(workspaceId)),
      teamId: teamId !== undefined ? Math.floor(Number(teamId)) : undefined,
      ilikePattern: qTrim ? `%${qTrim}%` : null,
    };

    const channelQb = createMemberChannelsUnionSelect(this.channelRepo, scope);
    const userQb = createDirectMessageCandidatesUnionSelect(
      this.workspaceMemberRepo,
      scope,
    );

    const { unionSql, params: unionParams } = mergeUnionFragments(
      channelQb.getQueryAndParameters(),
      userQb.getQueryAndParameters(),
    );

    const { total, rows } = await executeUnionCountAndPage(
      this.channelRepo.manager,
      unionSql,
      unionParams,
      limit,
      offset,
    );

    return {
      items: await this.hydrateInRowOrder(rows, issuer.id),
      total,
      page,
      limit,
    };
  }

  private async hydrateInRowOrder(
    rows: SearchUnionRow[],
    viewerUserId: number,
  ): Promise<SearchChannelsAndUsersItem[]> {
    const channelIds = rows
      .filter((r) => Number(r.kind) === searchUnionKind.channel)
      .map((r) => Number(r.ref_id));
    const userIds = rows
      .filter((r) => Number(r.kind) === searchUnionKind.user)
      .map((r) => Number(r.ref_id));

    const channelById = await this.loadChannelsById(channelIds, viewerUserId);
    const userById = await this.loadUsersById(userIds);

    const items: SearchChannelsAndUsersItem[] = [];
    for (const row of rows) {
      if (Number(row.kind) === searchUnionKind.channel) {
        const channel = channelById.get(Number(row.ref_id));
        if (channel) items.push({ kind: 'channel', channel });
      } else {
        const user = userById.get(Number(row.ref_id));
        if (user) items.push({ kind: 'user', user });
      }
    }
    return items;
  }

  private async loadChannelsById(
    channelIds: number[],
    viewerUserId: number,
  ): Promise<Map<number, Channel>> {
    const map = new Map<number, Channel>();
    if (!channelIds.length) return map;

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
      .where('c.id IN (:...channelIds)', { channelIds })
      .getMany();

    enrichChannelsForListView(channels, viewerUserId);
    for (const c of channels) map.set(c.id, c);
    return map;
  }

  private async loadUsersById(userIds: number[]): Promise<Map<number, User>> {
    const map = new Map<number, User>();
    if (!userIds.length) return map;
    const users = await this.userRepo.findBy({ id: In(userIds) });
    for (const u of users) map.set(u.id, u);
    return map;
  }
}
