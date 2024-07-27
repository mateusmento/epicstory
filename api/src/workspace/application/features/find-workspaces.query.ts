import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { WorkspaceMember } from 'src/workspace/domain/entities/workspace-member.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class FindWorkspaces {
  issuerId: number;

  constructor(data: Partial<FindWorkspaces> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindWorkspaces)
export class FindWorkspacesQuery implements IQueryHandler<FindWorkspaces> {
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async execute({ issuerId }: FindWorkspaces) {
    return this.workspaceRepo
      .createQueryBuilder('workspace')
      .innerJoin(WorkspaceMember, 'member', 'workspace.id = member.workspaceId')
      .where('member.userId = :issuerId', { issuerId })
      .getMany();
  }
}
