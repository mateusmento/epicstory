import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional, ValidateIf } from 'class-validator';
import { patch } from 'src/core/objects';
import { IssuerUserCanNotCreateProject } from 'src/project/domain/exceptions';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class UpdateProjectTeam {
  issuerId: number;

  projectId: number;

  /** Omit or pass `null` to unassign the project from its team. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  teamId?: number | null;

  constructor(data: Partial<UpdateProjectTeam> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateProjectTeam)
export class UpdateProjectTeamCommand
  implements ICommandHandler<UpdateProjectTeam>
{
  constructor(
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository,
    private teamRepo: TeamRepository,
  ) {}

  async execute({ issuerId, projectId, teamId }: UpdateProjectTeam) {
    const project = await this.projectRepo.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');

    const issuer = await this.workspaceRepo.findMember(
      project.workspaceId,
      issuerId,
    );
    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new IssuerUserCanNotCreateProject();

    if (teamId != null) {
      const team = await this.teamRepo.findOneBy({ id: teamId });
      if (!team) throw new TeamNotFound();
      if (team.workspaceId !== project.workspaceId) {
        throw new BadRequestException('Team does not belong to the workspace');
      }
      project.teamId = teamId;
    } else {
      project.teamId = null;
    }

    return this.projectRepo.save(project);
  }
}
