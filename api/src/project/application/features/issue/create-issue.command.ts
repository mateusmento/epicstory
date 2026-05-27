import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { JSONContent } from '@tiptap/core';
import { IsNotEmpty, IsNumber, IsObject, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  IssueActivityRepository,
  IssueRepository,
  ProjectRepository,
} from 'src/project/infrastructure/repositories';
import { Issue } from 'src/project/domain/entities';
import { Channel } from 'src/channel/domain/entities/channel.entity';
import { ChannelRepository } from 'src/channel/infrastructure/repositories';
import { EMPTY_TIPTAP_DOC, normalizeTiptapDoc } from '@epicstory/tiptap';
import { IssueKeyAllocationService } from 'src/project/application/services/issue-key-allocation.service';

export class CreateIssue {
  issuer: Issuer;
  @IsNotEmpty()
  title: string;
  @IsOptional()
  @IsObject()
  description?: JSONContent;
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
    private channelRepo: ChannelRepository,
    private issueActivities: IssueActivityRepository,
    private issueKeys: IssueKeyAllocationService,
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

    const commentChannel = await this.channelRepo.save(
      Channel.create({
        workspaceId,
        type: 'workspace_open',
        name: '',
      }),
    );

    const { issueNumber, issueKey } = await this.issueKeys.allocateIssueKey(
      data.projectId,
    );

    const issue = await this.issueRepo.save(
      Issue.create({
        ...data,
        issueNumber,
        issueKey,
        description: normalizeTiptapDoc(data.description ?? EMPTY_TIPTAP_DOC),
        workspaceId,
        parentIssueId,
        createdById: issuer.id,
        commentChannelId: commentChannel.id,
      }),
    );

    await this.issueActivities.save(
      this.issueActivities.create({
        issueId: issue.id,
        actorId: issuer.id,
        type: 'issue_created',
        messageId: null,
        attachmentId: null,
        payload: {},
      }),
    );

    return this.issueRepo.findOne({
      where: { id: issue.id },
      relations: {
        assignees: true,
        labels: true,
        parentIssue: true,
        subIssues: true,
      },
    });
  }
}
