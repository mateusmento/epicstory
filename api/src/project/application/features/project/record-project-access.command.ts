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

    await this.accessRepo.query(
      `
        INSERT INTO "workspace"."user_project_access" AS "access"
          ("user_id", "project_id", "access_count", "accessed_at")
        VALUES ($1, $2, 1, now())
        ON CONFLICT ("user_id", "project_id")
        DO UPDATE SET
          "access_count" = "access"."access_count" + 1,
          "accessed_at" = now()
      `,
      [issuerId, projectId],
    );
  }
}
