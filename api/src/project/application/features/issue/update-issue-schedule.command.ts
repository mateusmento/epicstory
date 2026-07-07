import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsDate, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssueRepository } from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class UpdateIssueSchedule {
  issueId: number;
  issuer: Issuer;

  @IsDate()
  @IsOptional()
  startsAt?: Date | null;

  @IsDate()
  @IsOptional()
  endsAt?: Date | null;

  constructor(data: Partial<UpdateIssueSchedule> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateIssueSchedule)
export class UpdateIssueScheduleCommand
  implements ICommandHandler<UpdateIssueSchedule>
{
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, issuer, startsAt, endsAt }: UpdateIssueSchedule) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (
      !(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id))
    ) {
      throw new IssuerUserIsNotWorkspaceMember();
    }

    if (issue.issueType !== 'epic') {
      throw new BadRequestException(
        'Only epics can be scheduled on the timeline',
      );
    }

    const nextStartsAt = startsAt !== undefined ? startsAt : issue.startsAt;
    const nextEndsAt = endsAt !== undefined ? endsAt : issue.endsAt;

    if (
      nextStartsAt != null &&
      nextEndsAt != null &&
      nextStartsAt > nextEndsAt
    ) {
      throw new BadRequestException(
        'startsAt must be before or equal to endsAt',
      );
    }

    if (startsAt !== undefined) issue.startsAt = startsAt;
    if (endsAt !== undefined) issue.endsAt = endsAt;

    await this.issueRepo.save(issue);

    return this.issueRepo.findOne({
      where: { id: issueId },
      relations: {
        assignees: true,
        labels: true,
        parentIssue: true,
        subIssues: true,
        project: true,
      },
    });
  }
}
