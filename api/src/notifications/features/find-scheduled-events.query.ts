import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsDate, IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { ScheduledEvent } from '../entities';
import { ScheduledEventRepository } from '../repositories';

export class FindScheduledEvents {
  @IsNumber()
  userId: number;

  @IsDate()
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @IsOptional()
  endDate?: Date;

  constructor(data: Partial<FindScheduledEvents>) {
    patch(this, data);
  }
}

@QueryHandler(FindScheduledEvents)
export class FindScheduledEventsHandler
  implements IQueryHandler<FindScheduledEvents>
{
  constructor(
    private readonly scheduledEventRepository: ScheduledEventRepository,
  ) {}

  async execute(query: FindScheduledEvents): Promise<ScheduledEvent[]> {
    const where: any = { userId: query.userId };

    if (query.startDate || query.endDate) {
      where.dueAt = {};
      if (query.startDate) {
        where.dueAt.$gte = query.startDate;
      }
      if (query.endDate) {
        where.dueAt.$lte = query.endDate;
      }
    }

    // Use TypeORM query builder for date range queries
    const queryBuilder = this.scheduledEventRepository
      .createQueryBuilder('event')
      .where('event.userId = :userId', { userId: query.userId });

    if (query.startDate) {
      queryBuilder.andWhere('event.dueAt >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('event.dueAt <= :endDate', {
        endDate: query.endDate,
      });
    }

    queryBuilder.orderBy('event.dueAt', 'ASC');

    return queryBuilder.getMany();
  }
}
