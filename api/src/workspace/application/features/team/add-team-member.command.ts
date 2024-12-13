import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { TeamMember } from 'src/workspace/domain/entities/team-member.entity';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  TeamMemberRepository,
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

class AddTeamMember {
  teamId: number;
  userId: number;
  issuerId: number;

  constructor(data: Partial<AddTeamMember>) {
    patch(this, data);
  }
}

@CommandHandler(AddTeamMember)
export class AddTeamMemberCommand implements ICommandHandler<AddTeamMember> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private teamRepo: TeamRepository,
    private teamMemberRepo: TeamMemberRepository,
  ) {}

  async execute({ teamId, userId, issuerId }: AddTeamMember) {
    const team = await this.teamRepo.findOneBy({ id: teamId });

    const issuer = await this.workspaceRepo.findMember(
      team.workspaceId,
      issuerId,
    );

    if (!issuer) throw new IssuerUserIsNotWorkspaceMember();

    const workspaceMember = await this.workspaceRepo.findMember(
      team.workspaceId,
      userId,
    );

    if (!workspaceMember)
      throw new BadRequestException('User is not a workspace member');

    const teamMember = await this.teamMemberRepo.save(
      TeamMember.create({
        teamId,
        userId,
        workspaceMemberId: workspaceMember.id,
      }),
    );

    return teamMember;
  }
}
