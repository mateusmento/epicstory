import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
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
  @IsOptional()
  search?: string;

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

const ORDER_COLUMNS: Record<string, string> = {
  createdAt: 'issue.createdAt',
  priority: 'issue.priority',
  title: 'issue.title',
  status: 'issue.status',
  dueDate: 'issue.dueDate',
  id: 'issue.id',
};

@QueryHandler(FindIssues)
export class FindIssuesQuery implements IQueryHandler<FindIssues> {
  constructor(private issueRepo: IssueRepository) {}

  async execute({
    workspaceId,
    projectId,
    search,
    orderBy,
    order,
    page,
    count,
  }: FindIssues) {
    const qb = this.issueRepo
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.assignees', 'assignees')
      .leftJoinAndSelect('issue.labels', 'labels')
      .leftJoinAndSelect('issue.parentIssue', 'parentIssue');

    // Project list endpoint scopes by projectId only; workspace list by workspaceId.
    // Match TypeORM `find` semantics: omit undefined filters (do not compare to NULL).
    if (workspaceId != null) {
      qb.andWhere('issue.workspaceId = :workspaceId', { workspaceId });
    }
    if (projectId != null) {
      qb.andWhere('issue.projectId = :projectId', { projectId });
    }

    const ftsQuery = search?.trim() || undefined;
    if (ftsQuery) {
      // websearch_to_tsquery: AND terms, "phrases", OR, -negation.
      // Match against both configs so issue keys (simple) and prose (english) work.
      qb.andWhere(
        `(
          issue.search_vector @@ websearch_to_tsquery('english', :ftsQuery)
          OR issue.search_vector @@ websearch_to_tsquery('simple', :ftsQuery)
        )`,
        { ftsQuery },
      );
      qb.addSelect(
        `GREATEST(
          ts_rank(issue.search_vector, websearch_to_tsquery('english', :ftsQuery)),
          ts_rank(issue.search_vector, websearch_to_tsquery('simple', :ftsQuery))
        )`,
        'rank',
      );
      qb.orderBy('rank', 'DESC');
    }

    const orderColumn = ORDER_COLUMNS[orderBy] ?? ORDER_COLUMNS.createdAt;
    const orderDirection = order === 'desc' ? 'DESC' : 'ASC';
    if (ftsQuery) {
      qb.addOrderBy(orderColumn, orderDirection);
    } else {
      qb.orderBy(orderColumn, orderDirection);
    }

    const pageNum = Number(page) || 0;
    const pageSize = Number(count) || 25;
    qb.skip(pageNum * pageSize).take(pageSize);

    const [content, total] = await qb.getManyAndCount();
    return Page.fromResult(content, total, { page: pageNum, count: pageSize });
  }
}
