import { NotFoundException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Issuer } from 'src/core/auth';
import { patch } from 'src/core/objects';
import { BacklogItemRepository } from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';
import { RemoveIssue } from '../issue/remove-issue.command';

export class RemoveBacklogItem {
  itemId: number;
  issuer: Issuer;
  deleteSubIssues?: boolean;

  constructor(data: Partial<RemoveBacklogItem> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveBacklogItem)
export class RemoveBacklogItemCommand
  implements ICommandHandler<RemoveBacklogItem>
{
  constructor(
    private backlogItemRepo: BacklogItemRepository,
    private commandBus: CommandBus,
  ) {}

  @Transactional()
  async execute({ itemId, issuer, deleteSubIssues }: RemoveBacklogItem) {
    const item = await this.backlogItemRepo.findOne({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Backlog item not found');

    await this.commandBus.execute(
      new RemoveIssue({
        issueId: item.issueId,
        issuer,
        deleteSubIssues,
      }),
    );

    return { deleted: true, id: itemId };
  }
}
