import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { IssueRepository } from 'src/project/infrastructure/repositories';

export class FindIssues {
  workspaceId: number;

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  @IsString()
  orderBy: string;

  @IsString()
  order: 'asc' | 'desc';

  @IsNumber()
  page: number;

  @IsNumber()
  count: number;

  constructor(data: Partial<FindIssues> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssues)
export class FindIssuesQuery implements IQueryHandler<FindIssues> {
  constructor(private issueRepo: IssueRepository) {}

  async execute({
    workspaceId,
    projectId,
    orderBy,
    order,
    page,
    count,
  }: FindIssues) {
    const content = await this.issueRepo.find({
      where: { workspaceId, projectId },
      relations: { assignees: true },
      order: {
        createdAt: orderBy === 'createdAt' ? (order ?? 'asc') : undefined,
        priority: orderBy === 'priority' ? (order ?? 'asc') : undefined,
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
