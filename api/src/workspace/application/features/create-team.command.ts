import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsArray, IsNotEmpty } from 'class-validator';
import { patch } from 'src/core/objects';
import { TeamRepository } from 'src/workspace/infrastructure/repositories/team.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class CreateTeam {
  issuerId: number;

  workspaceId: number;

  @IsNotEmpty()
  name: string;

  @IsArray()
  members: number[];

  constructor(data: Partial<CreateTeam>) {
    patch(this, data);
  }
}

@CommandHandler(CreateTeam)
export class CreateTeamCommand implements ICommandHandler<CreateTeam> {
  constructor(
    private teamRepo: TeamRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuerId, workspaceId, name }: CreateTeam) {
    const workspace = await this.workspaceRepo.get(workspaceId);
    if (!workspace) throw new NotFoundException('Workspace not found');
    const issuer = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    const team = workspace.createTeam(issuer, name);
    return this.teamRepo.save(team);
  }
}
