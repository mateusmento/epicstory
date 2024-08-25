import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { IssueRepository } from 'src/workspace/infrastructure/repositories/issue.repository';

export class FindIssues {
  workspaceId: number;

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  constructor(data: Partial<FindIssues> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssues)
export class FindIssuesQuery implements IQueryHandler<FindIssues> {
  constructor(private issueRepo: IssueRepository) {}

  async execute({ workspaceId, projectId }: FindIssues) {
    const content = await this.issueRepo.find({
      where: { workspaceId, projectId },
    });

    return { content };
  }
}
