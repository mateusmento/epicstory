import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IsNotEmpty } from 'class-validator';
import { patch } from 'src/core/objects';
import { WorkspaceProjectCreated } from 'src/workspace/contracts/events/workspace-project-created';
import { Backlog } from 'src/project/domain/entities';
import { BacklogRepository } from 'src/project/infrastructure/repositories';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { Transactional } from 'typeorm-transactional';

export class CreateProject {
  issuerId: number;

  workspaceId: number;

  @IsNotEmpty()
  name: string;

  constructor(data: Partial<CreateProject> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateProject)
export class CreateProjectCommand implements ICommandHandler<CreateProject> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private projectRepo: ProjectRepository,
    private backlogRepo: BacklogRepository,
    private eventEmitter: EventEmitter2,
  ) {}

  @Transactional()
  async execute({ issuerId, workspaceId, name }: CreateProject) {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const issuer = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    let project = workspace.createProject(issuer, name);
    project = await this.projectRepo.save(project);
    project.backlog = await this.backlogRepo.save(
      new Backlog({ projectId: project.id }),
    );
    await this.projectRepo.save(project);
    await this.eventEmitter.emitAsync(
      WorkspaceProjectCreated.name,
      new WorkspaceProjectCreated({ project }),
    );
    return project;
  }
}