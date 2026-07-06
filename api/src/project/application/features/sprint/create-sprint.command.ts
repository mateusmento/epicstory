import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { Issuer } from 'src/core/auth';
import { SprintRepository } from 'src/project/infrastructure/repositories';
import {
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class CreateSprint {
  issuer: Issuer;
  teamId: number;

  constructor(data: Partial<CreateSprint> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateSprint)
export class CreateSprintCommand implements ICommandHandler<CreateSprint> {
  constructor(
    private sprintRepo: SprintRepository,
    private teamRepo: TeamRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, teamId }: CreateSprint) {
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    if (!(await this.workspaceRepo.memberExists(team.workspaceId, issuer.id)))
      throw new ForbiddenException('Not a workspace member');

    const plannedExists = await this.sprintRepo.exists({
      where: { teamId, status: 'planned' },
    });
    if (plannedExists)
      throw new BadRequestException('Upcoming sprint already exists');

    const count = await this.sprintRepo.count({ where: { teamId } });
    const name = `Sprint ${count + 1}`;

    return this.sprintRepo.save({
      teamId,
      workspaceId: team.workspaceId,
      name,
      status: 'planned' as const,
      startsAt: null,
      endsAt: null,
      createdById: issuer.id,
    });
  }
}
