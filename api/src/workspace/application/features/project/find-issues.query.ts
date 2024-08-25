import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';

export class FindIssues {
  productId: number;

  constructor(data: Partial<FindIssues> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindIssues)
export class FindIssuesQuery implements IQueryHandler<FindIssues> {
  async execute({}: FindIssues) {}
}
