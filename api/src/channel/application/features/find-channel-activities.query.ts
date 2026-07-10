import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { IChannelActivity, IPage } from '@epicstory/contracts';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { patch } from 'src/core/objects';
import { ChannelActivityService } from '../services/channel-activity.service';

export class FindChannelActivities {
  channelId: number;
  issuerId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsDateString()
  beforeCreatedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  beforeId?: number;

  @IsOptional()
  @IsDateString()
  afterCreatedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  afterId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  aroundMessageId?: number;

  constructor(data: Partial<FindChannelActivities>) {
    patch(this, data);
  }
}

@QueryHandler(FindChannelActivities)
export class FindChannelActivitiesQuery
  implements IQueryHandler<FindChannelActivities>
{
  constructor(private channelActivityService: ChannelActivityService) {}

  execute(query: FindChannelActivities): Promise<IPage<IChannelActivity>> {
    const hasBeforeAt =
      query.beforeCreatedAt != null && query.beforeCreatedAt !== '';
    const hasBeforeId = query.beforeId != null;
    const hasAfterAt =
      query.afterCreatedAt != null && query.afterCreatedAt !== '';
    const hasAfterId = query.afterId != null;
    const hasAround = query.aroundMessageId != null;

    if (hasBeforeAt !== hasBeforeId) {
      throw new BadRequestException(
        'beforeCreatedAt and beforeId must both be provided for pagination',
      );
    }
    if (hasAfterAt !== hasAfterId) {
      throw new BadRequestException(
        'afterCreatedAt and afterId must both be provided for pagination',
      );
    }

    const modeCount =
      Number(hasBeforeAt) + Number(hasAfterAt) + Number(hasAround);
    if (modeCount > 1) {
      throw new BadRequestException(
        'Provide only one of before*, after*, or aroundMessageId',
      );
    }

    const limit = query.limit ?? 50;

    if (hasAround) {
      return this.channelActivityService.findAroundMessageForChannel(
        query.channelId,
        query.issuerId,
        query.aroundMessageId!,
        limit,
      );
    }

    let beforeDate: Date | undefined;
    if (hasBeforeAt && query.beforeCreatedAt) {
      beforeDate = new Date(query.beforeCreatedAt);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestException('Invalid beforeCreatedAt');
      }
    }

    let afterDate: Date | undefined;
    if (hasAfterAt && query.afterCreatedAt) {
      afterDate = new Date(query.afterCreatedAt);
      if (Number.isNaN(afterDate.getTime())) {
        throw new BadRequestException('Invalid afterCreatedAt');
      }
    }

    return this.channelActivityService.findPageForChannel(
      query.channelId,
      query.issuerId,
      {
        limit,
        beforeCreatedAt: beforeDate,
        beforeId: hasBeforeId ? query.beforeId : undefined,
        afterCreatedAt: afterDate,
        afterId: hasAfterId ? query.afterId : undefined,
      },
    );
  }
}
