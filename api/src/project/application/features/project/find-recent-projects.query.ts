import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { Issue, Project } from 'src/project/domain/entities';
import { UserProjectAccess } from 'src/project/domain/entities/user-project-access.entity';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';

export class FindRecentProjects {
  issuerId: number;
  workspaceId: number;

  @IsOptional()
  @IsNumber()
  count?: number;

  constructor(data: Partial<FindRecentProjects> = {}) {
    patch(this, data);
    this.count = this.count ?? 5;
  }
}

@QueryHandler(FindRecentProjects)
export class FindRecentProjectsQuery
  implements IQueryHandler<FindRecentProjects>
{
  constructor(private projectRepo: ProjectRepository) {}

  async execute({ issuerId, workspaceId, count }: FindRecentProjects) {
    const frecencyScore = `
      LN(access.access_count + 1) *
      (1.0 / (
        1 + 0.2 * EXTRACT(EPOCH FROM (now() - access.accessed_at)) / 86400
      ))
    `;

    const { entities, raw } = await this.projectRepo
      .createQueryBuilder('project')
      .innerJoin(
        UserProjectAccess,
        'access',
        'access.projectId = project.id AND access.userId = :issuerId',
        { issuerId },
      )
      .where('project.workspaceId = :workspaceId', { workspaceId })
      .addSelect(frecencyScore, 'frecencyScore')
      .addSelect(
        (qb) =>
          qb
            .select('COUNT(issue.id)', 'cnt')
            .from(Issue, 'issue')
            .where('issue.projectId = project.id'),
        'issueCount',
      )
      .orderBy(frecencyScore, 'DESC')
      .addOrderBy('access.accessedAt', 'DESC')
      .limit(count)
      .getRawAndEntities();

    return entities.map((project: Project, idx: number) => ({
      ...project,
      issueCount: Number(raw[idx]?.issueCount ?? 0),
    }));
  }
}
