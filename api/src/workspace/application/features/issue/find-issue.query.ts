import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { IssueRepository } from 'src/workspace/infrastructure/repositories';

export class FindIssue {
  issueId: number;

  constructor(data: Partial<FindIssue> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssue)
export class FindIssueQuery implements IQueryHandler<FindIssue> {
  constructor(private issueRepo: IssueRepository) {}

  async execute({ issueId }: FindIssue) {
    return this.issueRepo.findOne({
      where: { id: issueId },
      relations: { assignees: true },
    });
  }
}
