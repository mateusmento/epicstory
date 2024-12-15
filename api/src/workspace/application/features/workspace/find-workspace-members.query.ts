import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class FindWorkspaceMembers {
  workspaceId: number;

  @IsOptional()
  name?: string;

  constructor(data: Partial<FindWorkspaceMembers>) {
    patch(this, data);
  }
}

@QueryHandler(FindWorkspaceMembers)
export class FindWorkspaceMemberQuery
  implements IQueryHandler<FindWorkspaceMembers>
{
  constructor(private workspaceRepo: WorkspaceRepository) {}

  async execute({ workspaceId, name }: FindWorkspaceMembers) {
    return this.workspaceRepo.findMembers(
      { workspaceId, name },
      { user: true },
    );
  }
}
