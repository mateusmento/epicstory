import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { UserRepository } from 'src/auth';
import { patch } from 'src/core/objects';
import { TeamMember } from 'src/workspace/domain/entities/team-member.entity';
import {
  IssuerUserIsNotWorkspaceMember,
  TeamNotFound,
} from 'src/workspace/domain/exceptions';
import {
  TeamMemberRepository,
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class AddTeamMember {
  teamId: number;
  issuerId: number;

  @IsNumber()
  userId: number;

  constructor(data: Partial<AddTeamMember>) {
    patch(this, data);
  }
}

@CommandHandler(AddTeamMember)
export class AddTeamMemberCommand implements ICommandHandler<AddTeamMember> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private userRepo: UserRepository,
    private teamRepo: TeamRepository,
    private teamMemberRepo: TeamMemberRepository,
  ) {}

  async execute({ teamId, userId, issuerId }: AddTeamMember) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('User not found');

    const team = await this.teamRepo.findOneBy({ id: teamId });

    if (!team) throw new TeamNotFound();

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

    teamMember.user = user;
    return teamMember;
  }
}
