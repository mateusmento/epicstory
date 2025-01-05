import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BacklogItem } from 'src/project/domain/entities';
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
    const item = await this.backlogItemRepo.findOne({
      where: { id: itemId },
    });
    await this.connectAdjacentNodes(item);
    await this.backlogItemRepo.delete({ id: itemId });
    await this.issueRepo.delete({ id: item.issueId });
  }

  private async connectAdjacentNodes(item: BacklogItem) {
    if (item.previousId)
      await this.backlogItemRepo.update(
        { id: item.previousId },
        { nextId: item.nextId },
      );
    if (item.nextId)
      await this.backlogItemRepo.update(
        { id: item.nextId },
        { previousId: item.previousId },
      );
  }
}
