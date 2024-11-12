import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { Backlog } from 'src/workspace/domain/entities';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  ProjectRepository,
  SprintRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class CreateSprint {
  issuer: Issuer;
  @IsNumber()
  projectId: number;

  constructor(data: Partial<CreateSprint> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateSprint)
export class CreateSprintCommand implements ICommandHandler<CreateSprint> {
  constructor(
    private sprintRepo: SprintRepository,
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, ...data }: CreateSprint) {
    const project = await this.projectRepo.findOne({
      where: { id: data.projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const { workspaceId } = project;

    if (!(await this.workspaceRepo.memberExists(workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    return this.sprintRepo.save({
      ...data,
      workspaceId,
      createdById: issuer.id,
      backlog: new Backlog(),
    });
  }
}
