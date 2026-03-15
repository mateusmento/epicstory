import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { patch } from 'src/core/objects';
import { Page } from 'src/core/page';
import { Issue } from 'src/project/domain/entities';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';

export class FindProjects {
  workspaceId: number;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  count?: number;

  @IsOptional()
  @IsString()
  orderBy?: 'name' | 'id';

  @IsOptional()
  @IsString()
  order?: 'asc' | 'desc';

  constructor(data: Partial<FindProjects> = {}) {
    patch(this, data);
    this.page = this.page ?? 0;
    this.count = this.count ?? 50;
  }
}

@QueryHandler(FindProjects)
export class FindProjectsQuery implements IQueryHandler<FindProjects> {
  constructor(private projectRepo: ProjectRepository) {}

  async execute(query: FindProjects) {
    const { workspaceId, teamId } = query;

    const baseQb = this.projectRepo
      .createQueryBuilder('project')
      .where('project.workspaceId = :workspaceId', { workspaceId });

    if (teamId !== undefined) {
      baseQb.andWhere('project.teamId = :teamId', { teamId });
    }

    // Lean count query (no joins)
    const total = await baseQb.clone().getCount();

    const orderBy = query.orderBy ?? 'name';
    const orderDirection = (query.order ?? 'asc') as 'asc' | 'desc';
    const orderDirectionSql = orderDirection.toUpperCase() as 'ASC' | 'DESC';

    const dataQb = baseQb
      .clone()
      .orderBy(
        ['createdAt', 'name', 'id'].includes(orderBy)
          ? `project.${orderBy}`
          : 'project.id',
        orderDirectionSql,
        'NULLS LAST',
      )
      .addOrderBy('project.id', 'ASC')
      .skip((query.page ?? 0) * (query.count ?? 50))
      .take(query.count ?? 50)
      // Count issues using a correlated subquery (avoids groupBy + joins on the main query).
      .addSelect(
        (qb) =>
          qb
            .select('COUNT(issue.id)', 'cnt')
            .from(Issue, 'issue')
            .where('issue.projectId = project.id'),
        'issueCount',
      );

    const { entities, raw } = await dataQb.getRawAndEntities();

    const content = entities.map((project, idx) => ({
      ...project,
      issueCount: Number(raw[idx]?.issueCount ?? 0),
    }));

    return Page.fromResult(content, total, {
      page: query.page ?? 0,
      count: query.count ?? 50,
      orderBy,
      order: orderDirection,
    });
  }
}
