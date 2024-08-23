import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth/auth-user';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { TeamRepository } from 'src/workspace/infrastructure/repositories/team.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class FindTeams {
  workspaceId: number;
  issuer: Issuer;

  constructor(partial: Partial<FindTeams>) {
    patch(this, partial);
  }
}

@QueryHandler(FindTeams)
export class FindTeamsQuery implements IQueryHandler<FindTeams> {
  constructor(
    private teamRepo: TeamRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ workspaceId, issuer }: FindTeams) {
    const member = this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return this.teamRepo.find({ where: { workspaceId } });
  }
}