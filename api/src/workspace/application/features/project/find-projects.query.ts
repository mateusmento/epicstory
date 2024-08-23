import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { ProjectRepository } from 'src/workspace/infrastructure/repositories/project.repository';

export class FindProjects {
  workspaceId: number;

  constructor(data: Partial<FindProjects> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindProjects)
export class FindProjectsQuery implements IQueryHandler<FindProjects> {
  constructor(private projectRepo: ProjectRepository) {}

  async execute({ workspaceId }: FindProjects) {
    return this.projectRepo.find({ where: { workspaceId } });
  }
}
