import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { MessageRepository } from 'src/channel/infrastructure/repositories';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';

export class FindMessages {
  channelId: number;
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
  orderBy?: string;

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC';

  constructor(data: Partial<FindMessages>) {
    patch(this, data);
  }
}

@QueryHandler(FindMessages)
export class FindMessagesQuery implements IQueryHandler<FindMessages> {
  constructor(private messageRepo: MessageRepository) {}

  async execute({
    channelId,
    issuerId,
    query,
    page,
    size,
    orderBy,
    order,
  }: FindMessages) {
    const baseQb = this.messageRepo
      .createQueryBuilder('m')
      .where('m.channelId = :channelId', { channelId })
      .andWhere('m.userId <> :issuerId', { issuerId });

    if (query) {
      const match = `%${query}%`;
      baseQb.andWhere('m.content ILIKE :match', { match });
    }

    const dataQb = baseQb.clone();

    if (orderBy === 'sentAt') {
      dataQb.orderBy('m.sentAt', order ?? 'DESC', 'NULLS LAST');
    }

    dataQb.addOrderBy('m.id', 'DESC', 'NULLS LAST');

    const pageNumber = page ?? 0;
    const pageSize = size ?? 20;

    const [total, messages] = await Promise.all([
      baseQb.getCount(),
      dataQb
        .skip(pageNumber * pageSize)
        .take(pageSize)
        .getMany(),
    ]);

    return Page.fromResult(messages, total, {
      page: pageNumber,
      count: pageSize,
    });
  }
}
