import type { INotification, Page as ContractPage } from '@epicstory/contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { notificationEntityToClient } from '../utils/notification-entity-to-client';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { NotificationRepository } from '../repositories';

export class FindNotifications {
  @IsNumber()
  userId: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  seen?: boolean;

  @IsNumber()
  page: number;

  @IsNumber()
  count: number;

  @IsString()
  @IsOptional()
  orderBy?: string;

  @IsString()
  @IsOptional()
  order?: string;

  constructor(data: Partial<FindNotifications>) {
    patch(this, data);
    this.page = this.page || 0;
    this.count = this.count || 10;
  }
}

@QueryHandler(FindNotifications)
export class FindNotificationsHandler
  implements IQueryHandler<FindNotifications>
{
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(
    query: FindNotifications,
  ): Promise<ContractPage<INotification>> {
    const total = await this.notificationRepository.count({
      where: { userId: query.userId, type: query.type, seen: query.seen },
    });

    const orderBy = query.orderBy ?? 'createdAt';
    const orderDirection = (query.order ?? 'desc') as 'asc' | 'desc';

    const rows = await this.notificationRepository.find({
      where: { userId: query.userId, type: query.type, seen: query.seen },
      order: {
        createdAt: orderBy === 'createdAt' ? orderDirection : undefined,
      },
      skip: query.page * query.count,
      take: query.count,
    });

    const page = Page.fromResult(
      rows.map(notificationEntityToClient),
      total,
      query,
    );

    return {
      content: page.content,
      page: page.page,
      count: page.count,
      hasNext: page.hasNext,
      hasPrevious: page.hasPrevious,
      total: page.total,
    };
  }
}
