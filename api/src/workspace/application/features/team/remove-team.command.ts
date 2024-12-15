import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import {
  IssuerUserIsNotWorkspaceMember,
  TeamNotFound,
} from 'src/workspace/domain/exceptions';
import {
  TeamMemberRepository,
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class RemoveTeam {
  teamId: number;
  issuerId: number;

  constructor(data: Partial<RemoveTeam> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveTeam)
export class RemoveTeamCommand implements ICommandHandler<RemoveTeam> {
  constructor(
    private teamRepo: TeamRepository,
    private teamMemberRepo: TeamMemberRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ teamId, issuerId }: RemoveTeam) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new TeamNotFound();

    const issuer = await this.workspaceRepo.findMember(
      team.workspaceId,
      issuerId,
    );

    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    await this.teamMemberRepo.delete({ teamId });
    await this.teamRepo.delete({ id: teamId });
  }
}
