import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { UserProjectAccessRepository } from 'src/project/infrastructure/repositories/user-project-access.repository';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class RecordProjectAccess {
  issuerId: number;
  projectId: number;

  constructor(data: Partial<RecordProjectAccess> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RecordProjectAccess)
export class RecordProjectAccessCommand
  implements ICommandHandler<RecordProjectAccess>
{
  constructor(
    private projectRepo: ProjectRepository,
    private accessRepo: UserProjectAccessRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuerId, projectId }: RecordProjectAccess) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');

    const member = await this.workspaceRepo.findMember(
      project.workspaceId,
      issuerId,
    );
    if (!member) throw new ForbiddenException('Not a workspace member');

    await this.accessRepo.upsert(
      { userId: issuerId, projectId },
      {
        conflictPaths: ['userId', 'projectId'],
        skipUpdateIfNoValuesChanged: false,
      },
    );
  }
}
