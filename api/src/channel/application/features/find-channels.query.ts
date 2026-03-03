import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { mapChannelToDto } from 'src/channel/domain/dtos/channel.dto';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Brackets } from 'typeorm';

export class FindChannels {
  workspaceId: number;
  issuerId: number;

  @IsString()
  @IsOptional()
  query?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  orderBy?: 'name' | 'createdAt' | 'lastMessageSentAt';

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC';

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

  async execute({
    issuerId,
    workspaceId,
    query,
    page,
    size,
    orderBy,
    order,
  }: FindChannels) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();

    // Build a minimal query for filters (used by both count and data queries).
    let baseQb = this.channelRepo
      .createQueryBuilder('c')
      .innerJoin('c.peers', 'peer', 'peer.id = :issuerId', { issuerId })
      .where('c.workspaceId = :workspaceId', { workspaceId });

    if (query) {
      const match = `%${query}%`;
      baseQb = baseQb.andWhere(
        new Brackets((qb) =>
          qb
            .where('c.name ILIKE :match', { match })
            .orWhere('peer.name ILIKE :match', { match }),
        ),
      );
    }

    // Count should be as lean as possible: only joins required for filtering.
    const countQb = baseQb.clone();

    // Data query needs relations and order-by fields.
    let dataQb = baseQb
      .clone()
      .leftJoinAndSelect('c.peers', 'p')
      .leftJoinAndSelect('c.meeting', 'm')
      .leftJoinAndSelect('c.lastMessage', 'msg')
      .addSelect('COALESCE(c.name, peer.name)', 'display_name');

    if (orderBy === 'name') {
      dataQb = dataQb
        .orderBy('display_name', order ?? 'ASC', 'NULLS LAST')
        .addOrderBy('c.createdAt', 'DESC', 'NULLS LAST');
    } else if (orderBy === 'lastMessageSentAt') {
      // TypeORM can't safely paginate (skip/take) with complex ORDER BY expressions that contain
      // dotted aliases (e.g. `msg.sentAt`) because it tries to parse the whole string as `alias.column`.
      // So we select the expression under an alias and order by that alias.
      dataQb = dataQb
        .addSelect(
          'CASE WHEN msg.id IS NULL THEN c.createdAt ELSE msg.sentAt END',
          'last_activity_at',
        )
        .orderBy('last_activity_at', order ?? 'DESC', 'NULLS LAST')
        .addOrderBy('c.createdAt', 'DESC', 'NULLS LAST');
    } else {
      dataQb = dataQb.orderBy('c.createdAt', order ?? 'DESC', 'NULLS LAST');
    }

    const pageNumber = page ?? 0;
    const pageSize = size ?? 20;

    const [total, channels] = await Promise.all([
      countQb.getCount(),
      dataQb
        .skip(pageNumber * pageSize)
        .take(pageSize)
        .getMany(),
    ]);

    const channelsDtos = channels.map((channel) =>
      mapChannelToDto(channel, issuerId),
    );

    return Page.fromResult(channelsDtos, total, {
      page: pageNumber,
      count: pageSize,
    });
  }
}
