import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values';
import {
  TeamMemberRepository,
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class RemoveTeamMember {
  teamMemberId: number;
  issuerId: number;

  constructor(data: Partial<RemoveTeamMember>) {
    patch(this, data);
  }
}

@CommandHandler(RemoveTeamMember)
export class RemoveTeamMemberCommand
  implements ICommandHandler<RemoveTeamMember>
{
  constructor(
    private teamRepo: TeamRepository,
    private teamMemberRepo: TeamMemberRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ teamMemberId, issuerId }: RemoveTeamMember) {
    const teamMember = await this.teamMemberRepo.findOne({
      where: { id: teamMemberId },
    });

    if (!teamMember) throw new NotFoundException('Team member not found');

    const team = await this.teamRepo.findOne({
      where: { id: teamMember.teamId },
    });

    const issuer = await this.workspaceRepo.findMember(
      team.workspaceId,
      issuerId,
    );

    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new BadRequestException('Issuer user can not remove team member');

    await this.teamMemberRepo.delete({ id: teamMemberId });
  }
}
