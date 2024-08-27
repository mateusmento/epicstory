import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsDate, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  IssueRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';

export class UpdateIssue {
  issueId: number;
  issuer: Issuer;

  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsNotEmpty()
  @IsOptional()
  status?: string;

  @IsDate()
  @IsOptional()
  dueDate: Date;

  @IsNumber()
  @IsOptional()
  priority?: number | null;

  constructor(data: Partial<UpdateIssue> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateIssue)
export class UpdateIssueCommand implements ICommandHandler<UpdateIssue> {
  constructor(
    private issueRepo: IssueRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issueId, issuer, ...data }: UpdateIssue) {
    const issue = await this.issueRepo.findOne({ where: { id: issueId } });
    if (!(await this.workspaceRepo.memberExists(issue.workspaceId, issuer.id)))
      throw new IssuerUserIsNotWorkspaceMember();
    patch(issue, data);
    return this.issueRepo.save(issue);
  }
}
