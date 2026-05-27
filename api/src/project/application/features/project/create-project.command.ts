import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { patch } from 'src/core/objects';
import { IssueKeyAllocationService } from 'src/project/application/services/issue-key-allocation.service';
import { Backlog } from 'src/project/domain/entities';
import { BacklogRepository } from 'src/project/infrastructure/repositories';
import { ProjectRepository } from 'src/project/infrastructure/repositories/project.repository';
import { WorkspaceProjectCreated } from 'src/workspace/contracts/events/workspace-project-created';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { Transactional } from 'typeorm-transactional';

export class CreateProject {
  issuerId: number;

  workspaceId: number;

  @IsOptional()
  @IsNumber()
  teamId?: number;

  @IsNotEmpty()
  name: string;

  /** Optional Jira-style project key; unique per workspace. */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  issueKeyPrefix?: string;

  constructor(data: Partial<CreateProject> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateProject)
export class CreateProjectCommand implements ICommandHandler<CreateProject> {
  constructor(
    private workspaceRepo: WorkspaceRepository,
    private teamRepo: TeamRepository,
    private projectRepo: ProjectRepository,
    private backlogRepo: BacklogRepository,
    private eventEmitter: EventEmitter2,
    private issueKeys: IssueKeyAllocationService,
  ) {}

  @Transactional()
  async execute({
    issuerId,
    workspaceId,
    teamId,
    name,
    issueKeyPrefix,
  }: CreateProject) {
    const workspace = await this.workspaceRepo.findOneBy({ id: workspaceId });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const issuer = await this.workspaceRepo.findMember(workspaceId, issuerId);
    if (!issuer)
      throw new ForbiddenException('Issuer is not a workspace member');
    if (teamId) {
      const team = await this.teamRepo.findOneBy({ id: teamId });
      if (!team) throw new TeamNotFound();
      if (team.workspaceId !== workspace.id) {
        throw new BadRequestException('Team does not belong to the workspace');
      }
    }
    let project = workspace.createProject(issuer, teamId, name);
    project.issueKeyPrefix = await this.issueKeys.resolvePrefixForNewProject({
      workspaceId,
      projectName: name,
      customPrefix: issueKeyPrefix,
    });
    project.nextIssueNumber = 1;
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
