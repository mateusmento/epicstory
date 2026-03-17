import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  IssueRepository,
  LabelRepository,
} from 'src/project/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class RemoveLabel {
  issuer: Issuer;

  @IsNumber()
  issueId: number;

  @IsNumber()
  labelId: number;

  constructor(data: Partial<RemoveLabel> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveLabel)
export class RemoveLabelCommand implements ICommandHandler<RemoveLabel> {
  constructor(
    private issueRepo: IssueRepository,
    private labelRepo: LabelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, issueId, labelId }: RemoveLabel) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const label = await this.labelRepo.findOne({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Label not found');
    if (label.workspaceId !== issue.workspaceId)
      throw new NotFoundException('Label not found');

    await this.issueRepo.query(
      `DELETE FROM "${PROJECT_SCHEMA}"."issue_label"
       WHERE "issue_id" = $1 AND "label_id" = $2`,
      [issueId, labelId],
    );

    const updated = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true, labels: true },
    });
    if (!updated) throw new NotFoundException('Issue not found');
    return updated;
  }
}
