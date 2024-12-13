import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  BacklogItemRepository,
  IssueRepository,
} from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class RemoveBacklogItem {
  itemId: number;
}

@CommandHandler(RemoveBacklogItem)
export class RemoveBacklogItemCommand
  implements ICommandHandler<RemoveBacklogItem>
{
  constructor(
    private backlogItemRepo: BacklogItemRepository,
    private issueRepo: IssueRepository,
  ) {}

  @Transactional()
  async execute({ itemId }: RemoveBacklogItem) {
    const item = await this.backlogItemRepo.findOneBy({ id: itemId });
    await this.backlogItemRepo.delete({ id: itemId });
    await this.issueRepo.delete({ id: item.issueId });
  }
}
