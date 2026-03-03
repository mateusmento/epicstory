import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { Brackets } from 'typeorm';

export class FindIssues {
  workspaceId: number;

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  @IsString()
  @IsOptional()
  query?: string;

  @IsString()
  @IsOptional()
  orderBy?: string;

  @IsString()
  @IsOptional()
  order?: 'ASC' | 'DESC';

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  count?: number;

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
    query,
    orderBy,
    order,
    page,
    count,
  }: FindIssues) {
    const baseQb = this.issueRepo
      .createQueryBuilder('issue')
      .where('issue.workspaceId = :workspaceId', { workspaceId })
      .andWhere('issue.projectId = :projectId', { projectId });

    if (query) {
      baseQb.andWhere(
        new Brackets((qb) =>
          qb
            .where('issue.title ILIKE :query', { query: `%${query}%` })
            .orWhere('issue.description ILIKE :query', { query: `%${query}%` }),
        ),
      );
    }

    const dataQb = baseQb.clone();

    if (orderBy === 'createdAt') {
      dataQb.orderBy('issue.createdAt', order ?? 'DESC', 'NULLS LAST');
    } else if (orderBy === 'priority') {
      dataQb.orderBy('issue.priority', order ?? 'DESC', 'NULLS LAST');
    }

    dataQb.addOrderBy('issue.id', 'DESC', 'NULLS LAST');

    const pageNumber = page ?? 0;
    const pageSize = count ?? 20;

    const [total, issues] = await Promise.all([
      baseQb.getCount(),
      dataQb
        .skip(pageNumber * pageSize)
        .take(pageSize)
        .getMany(),
    ]);

    return Page.fromResult(issues, total, {
      page: pageNumber,
      count: pageSize,
    });
  }
}
