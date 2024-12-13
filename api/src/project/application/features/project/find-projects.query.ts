import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';

export class FindProjects {
  workspaceId: number;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  constructor(data: Partial<FindProjects> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindProjects)
export class FindProjectsQuery implements IQueryHandler<FindProjects> {
  constructor(private projectRepo: ProjectRepository) {}

  async execute({ workspaceId, teamId }: FindProjects) {
    return this.projectRepo.find({ where: { workspaceId, teamId } });
  }
}
