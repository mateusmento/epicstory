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

export class AddLabel {
  issuer: Issuer;

  issueId: number;

  @IsNumber()
  labelId: number;

  constructor(data: Partial<AddLabel> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AddLabel)
export class AddLabelCommand implements ICommandHandler<AddLabel> {
  constructor(
    private issueRepo: IssueRepository,
    private labelRepo: LabelRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, issueId, labelId }: AddLabel) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!issue) throw new NotFoundException('Issue not found');

    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();

    const label = await this.labelRepo.findOne({ where: { id: labelId } });
    if (!label) throw new NotFoundException('Label not found');
    if (label.workspaceId !== issue.workspaceId)
      throw new NotFoundException('Label not found');

    // Idempotent insert
    await this.issueRepo.query(
      `INSERT INTO "${PROJECT_SCHEMA}"."issue_label" ("issue_id", "label_id")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [issueId, labelId],
    );

    const updated = await this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true, labels: true, parentIssue: true },
    });
    if (!updated) throw new NotFoundException('Issue not found');
    return updated;
  }
}
