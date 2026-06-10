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

    if (hasBeforeAt !== hasBeforeId) {
      throw new BadRequestException(
        'beforeCreatedAt and beforeId must both be provided for pagination',
      );
    }

    let beforeDate: Date | undefined;
    if (hasBeforeAt && query.beforeCreatedAt) {
      beforeDate = new Date(query.beforeCreatedAt);
      if (Number.isNaN(beforeDate.getTime())) {
        throw new BadRequestException('Invalid beforeCreatedAt');
      }
    }

    const limit = query.limit ?? 50;

    return this.channelActivityService.findPageForChannel(
      query.channelId,
      query.issuerId,
      {
        limit,
        beforeCreatedAt: beforeDate,
        beforeId: hasBeforeId ? query.beforeId : undefined,
      },
    );
  }
}
