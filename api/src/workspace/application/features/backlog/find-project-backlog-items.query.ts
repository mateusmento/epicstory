import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { ProjectRepository } from 'src/workspace/infrastructure/repositories';
import { FindBacklogItems } from './find-backlog-items.query';

export class FindProjectBacklogItems extends FindBacklogItems {
  projectId: number;

  constructor(data: Partial<FindProjectBacklogItems> = {}) {
    super(data);
  }
}

@QueryHandler(FindProjectBacklogItems)
export class FindProjectBacklogItemsQuery
  implements IQueryHandler<FindProjectBacklogItems>
{
  constructor(
    private projectRepo: ProjectRepository,
    private queryBus: QueryBus,
  ) {}

  async execute({ projectId, ...query }: FindProjectBacklogItems) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });

    return this.queryBus.execute(
      new FindProjectBacklogItems({ ...query, backlogId: project.backlogId }),
    );
  }
}
