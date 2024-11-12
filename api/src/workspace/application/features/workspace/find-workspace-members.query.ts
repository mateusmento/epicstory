import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class FindWorkspaceMembers {
  workspaceId: number;

  constructor(data: Partial<FindWorkspaceMembers>) {
    patch(this, data);
  }
}

@QueryHandler(FindWorkspaceMembers)
export class FindWorkspaceMemberQuery
  implements IQueryHandler<FindWorkspaceMembers>
{
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async execute({ workspaceId }: FindWorkspaceMembers) {
    return this.workspaceRepo.findMembers(workspaceId, { user: true });
  }
}
