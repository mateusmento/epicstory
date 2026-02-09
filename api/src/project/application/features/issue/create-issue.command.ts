import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  IssueRepository,
  ProjectRepository,
} from 'src/project/infrastructure/repositories';
import { Issue } from 'src/project/domain/entities';

export class CreateIssue {
  issuer: Issuer;
  @IsNotEmpty()
  title: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsNumber()
  projectId: number;

  @IsNumber()
  @IsOptional()
  parentIssueId?: number;

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

  async execute({ issuer, parentIssueId, ...data }: CreateIssue) {
    const project = await this.projectRepo.findOne({
      where: { id: data.projectId },
    });

    if (!project) throw new NotFoundException('Project not found');

    const { workspaceId } = project;

    if (!(await this.workspaceRepo.memberExists(workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    if (parentIssueId) {
      const parentIssue = await this.issueRepo.findOne({
        where: { id: parentIssueId },
      });
      if (!parentIssue) throw new NotFoundException('Parent issue not found');
    }

    return this.issueRepo.save(
      Issue.create({
        ...data,
        workspaceId,
        parentIssueId,
        createdById: issuer.id,
      }),
    );
  }
}
