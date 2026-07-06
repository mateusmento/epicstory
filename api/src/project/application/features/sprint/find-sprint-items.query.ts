import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { SprintItemRepository } from 'src/project/infrastructure/repositories';

export class FindSprintItems {
  sprintId: number;

  constructor(data: Partial<FindSprintItems> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindSprintItems)
export class FindSprintItemsQuery implements IQueryHandler<FindSprintItems> {
  constructor(private sprintItemRepo: SprintItemRepository) {}

  async execute({ sprintId }: FindSprintItems) {
    return this.sprintItemRepo.find({
      where: { sprintId },
      relations: {
        issue: { assignees: true, labels: true },
      },
      order: { order: 'ASC' },
    });
  }
}
