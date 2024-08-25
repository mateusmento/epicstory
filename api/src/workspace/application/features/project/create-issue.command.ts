import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { IssueRepository } from 'src/workspace/infrastructure/repositories/issue.repository';
import { ProjectRepository } from 'src/workspace/infrastructure/repositories/project.repository';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';

export class CreateIssue {
  issuer: Issuer;
  @IsNotEmpty()
  title: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsNumber()
  projectId: number;

  constructor(data: Partial<CreateIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CreateIssue)
export class CreateIssueCommand implements ICommandHandler<CreateIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private projectRepo: ProjectRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, ...data }: CreateIssue) {
    const project = await this.projectRepo.findOne({
      where: { id: data.projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const { workspaceId } = project;

    if (!(await this.workspaceRepo.memberExists(workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    return this.issueRepo.save({
      ...data,
      workspaceId,
      createdById: issuer.id,
    });
  }
}
