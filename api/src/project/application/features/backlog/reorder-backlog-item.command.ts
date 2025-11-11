import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { BacklogItem } from 'src/project/domain/entities';
import { BacklogItemRepository } from 'src/project/infrastructure/repositories';
import { MoreThan, Not } from 'typeorm';
import { Transactional } from 'typeorm-transactional';

export class ReorderBacklogItem {
  @IsNumber()
  backlogId: number;
  backlogItemId: number;
  @IsNumber()
  @IsOptional()
  afterOf: number;

  constructor(data: Partial<ReorderBacklogItem>) {
    patch(this, data);
  }
}

@CommandHandler(ReorderBacklogItem)
export class ReorderBacklogItemCommand
  implements ICommandHandler<ReorderBacklogItem>
{
  constructor(private backlogItemRepo: BacklogItemRepository) {}

  @Transactional()
  async execute({ backlogItemId, afterOf }: ReorderBacklogItem) {
    if (backlogItemId === afterOf) {
      throw new BadRequestException(
        'Can not reorder backlog item after itself',
      );
    }

    if (!afterOf) {
      await this.backlogItemRepo.update(backlogItemId, { order: 1 });
      return;
    }

    const itemBefore = await this.backlogItemRepo.findOne({
      where: { id: afterOf },
    });

    const itemAfter = await this.backlogItemRepo.findOne({
      where: {
        order: MoreThan(itemBefore.order),
        backlogId: itemBefore.backlogId,
        id: Not(itemBefore.id),
      },
      order: { order: 'ASC' },
    });

    const order = calculateOrder(itemBefore, itemAfter);

    await this.backlogItemRepo.update(backlogItemId, { order });
  }
}

function calculateOrder(before: BacklogItem, after: BacklogItem | null) {
  return after ? (before.order + after.order) / 2 : before.order + 1;
}
