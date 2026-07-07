import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import {
  IssueDependencyRepository,
  IssueRepository,
  ProjectRepository,
} from 'src/project/infrastructure/repositories';
import {
  IssuerUserIsNotWorkspaceMember,
  TeamNotFound,
} from 'src/workspace/domain/exceptions';
import {
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { In } from 'typeorm';

export class FindTeamTimeline {
  teamId: number;
  issuer: Issuer;

  constructor(data: Partial<FindTeamTimeline> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindTeamTimeline)
export class FindTeamTimelineQuery implements IQueryHandler<FindTeamTimeline> {
  constructor(
    private teamRepo: TeamRepository,
    private workspaceRepo: WorkspaceRepository,
    private projectRepo: ProjectRepository,
    private issueRepo: IssueRepository,
    private issueDependencyRepo: IssueDependencyRepository,
  ) {}

  async execute({ teamId, issuer }: FindTeamTimeline) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new TeamNotFound();

    if (!(await this.workspaceRepo.memberExists(team.workspaceId, issuer.id))) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    const projects = await this.projectRepo.find({
      where: { teamId, workspaceId: team.workspaceId },
      order: { name: 'ASC' },
    });

    const projectIds = projects.map((p) => p.id);
    if (projectIds.length === 0) {
      return { projects: [], epics: [], dependencies: [] };
    }

    const epics = await this.issueRepo.find({
      where: {
        projectId: In(projectIds),
        issueType: 'epic',
      },
      relations: {
        assignees: true,
        labels: true,
        project: true,
      },
      order: { issueKey: 'ASC' },
    });

    const epicIds = epics.map((e) => e.id);
    if (epicIds.length === 0) {
      return { projects, epics: [], dependencies: [] };
    }

    const dependencies = await this.issueDependencyRepo
      .createQueryBuilder('dep')
      .where('dep.issue_id IN (:...epicIds)', { epicIds })
      .andWhere('dep.depends_on_issue_id IN (:...epicIds)', { epicIds })
      .getMany();

    return { projects, epics, dependencies };
  }
}
