import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BacklogItemRepository,
  BacklogRepository,
  IssueRepository,
  ProjectRepository,
} from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class RemoveProject {
  projectId: number;
}

@CommandHandler(RemoveProject)
export class RemoveProjectCommand implements ICommandHandler<RemoveProject> {
  constructor(
    private projectRepo: ProjectRepository,
    private backlogRepo: BacklogRepository,
    private backlogItemRepo: BacklogItemRepository,
    private issueRepo: IssueRepository,
  ) {}

  @Transactional()
  async execute({ projectId }: RemoveProject) {
    await this.backlogItemRepo.delete({ projectId });
    await this.issueRepo.delete({ projectId });
    await this.projectRepo.update({ id: projectId }, { backlogId: null });
    await this.backlogRepo.delete({ projectId });
    await this.projectRepo.delete({ id: projectId });
  }
}
