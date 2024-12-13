import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { ProjectRepository } from 'src/project/infrastructure/repositories';

export class FindProject {
  projectId: number;

  constructor(data: Partial<FindProject>) {
    patch(this, data);
  }
}

@QueryHandler(FindProject)
export class FindProjectQuery implements IQueryHandler<FindProject> {
  constructor(private projectRepo: ProjectRepository) {}

  async execute({ projectId }: FindProject) {
    return this.projectRepo.findOne({
      where: { id: projectId },
    });
  }
}
