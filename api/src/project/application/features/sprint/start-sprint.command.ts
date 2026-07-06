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

export class StartSprint {
  issuer: Issuer;
  sprintId: number;

  constructor(data: Partial<StartSprint> = {}) {
    patch(this, data);
  }
}

@CommandHandler(StartSprint)
export class StartSprintCommand implements ICommandHandler<StartSprint> {
  constructor(
    private sprintRepo: SprintRepository,
    private teamRepo: TeamRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, sprintId }: StartSprint) {
    const sprint = await this.sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');
    if (sprint.status !== 'planned')
      throw new BadRequestException('Sprint is not in planned status');

    const team = await this.teamRepo.findOne({ where: { id: sprint.teamId } });
    if (!team) throw new NotFoundException('Team not found');

    if (!(await this.workspaceRepo.memberExists(team.workspaceId, issuer.id)))
      throw new ForbiddenException('Not a workspace member');

    const activeSprint = await this.sprintRepo.findOne({
      where: { teamId: sprint.teamId, status: 'active' },
    });
    if (activeSprint)
      throw new BadRequestException('Team already has an active sprint');

    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + team.sprintCadenceDays);

    await this.sprintRepo.update(sprintId, {
      status: 'active',
      startsAt,
      endsAt,
    });
    return this.sprintRepo.findOne({ where: { id: sprintId } });
  }
}
