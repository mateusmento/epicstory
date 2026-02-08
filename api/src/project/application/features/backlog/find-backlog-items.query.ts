import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { BacklogItemRepository } from 'src/project/infrastructure/repositories';

export class FindBacklogItems {
  backlogId?: number;

  projectId?: number;

  @IsString()
  orderBy: string;

  @IsString()
  order: 'asc' | 'desc';

  @IsNumber()
  page: number;

  @IsNumber()
  count: number;

  constructor(data: Partial<FindBacklogItems>) {
    patch(this, data);
  }
}

@QueryHandler(FindBacklogItems)
export class FindBacklogItemsQuery implements IQueryHandler<FindBacklogItems> {
  constructor(private backlogItemRepo: BacklogItemRepository) {}

  async execute({
    backlogId,
    projectId,
    orderBy,
    order,
    page,
    count,
  }: FindBacklogItems) {
    const content = await this.backlogItemRepo.find({
      where: { backlogId, projectId },
      relations: { issue: { assignees: true } },
      order: {
        issue: {
          createdAt: orderBy === 'createdAt' ? (order ?? 'asc') : undefined,
          title: orderBy === 'title' ? (order ?? 'asc') : undefined,
          status: orderBy === 'status' ? (order ?? 'asc') : undefined,
          priority: orderBy === 'priority' ? (order ?? 'asc') : undefined,
          dueDate: orderBy === 'dueDate' ? (order ?? 'asc') : undefined,
        },
        order: orderBy === 'manual' ? (order ?? 'asc') : undefined,
      },
      skip: page * count,
      take: count + 1,
    });

    const hasPrevious = page > 0;
    const hasNext = content.length === count + 1;
    if (hasNext) content.pop();
    return { content, page, count, hasNext, hasPrevious };
  }
}
