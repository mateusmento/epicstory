import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth/auth-user';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import {
  TeamMemberRepository,
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class FindTeamMembers {
  teamId: number;
  issuer: Issuer;

  constructor(partial: Partial<FindTeamMembers>) {
    patch(this, partial);
  }
}

@QueryHandler(FindTeamMembers)
export class FindTeamMembersQuery implements IQueryHandler<FindTeamMembers> {
  constructor(
    private teamRepo: TeamRepository,
    private teamMemberRepo: TeamMemberRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ teamId, issuer }: FindTeamMembers) {
    const team = await this.teamRepo.findOneBy({ id: teamId });
    if (!team) throw new TeamNotFound();
    const member = await this.workspaceRepo.findMember(
      team.workspaceId,
      issuer.id,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    return this.teamMemberRepo.find({
      where: { teamId },
      relations: { user: true },
    });
  }
}
