import { Injectable, NotFoundException } from '@nestjs/common';
import { BacklogItem } from 'src/project/domain/entities';
import { BacklogItemRepository } from 'src/project/infrastructure/repositories';
import { And, In, MoreThan, Not } from 'typeorm';

@Injectable()
export class BacklogItemService {
  constructor(private backlogItemRepo: BacklogItemRepository) {}

  async reorder(item: BacklogItem, afterOf: number | null) {
    return this.findNewOrder(item.backlogId, afterOf, [item.id]);
  }

  async findNewOrder(
    backlogId: number,
    afterOf: number | null,
    excludeIds: number[] = [],
  ) {
    const itemBefore = afterOf
      ? await this.findBacklogItem(afterOf, backlogId)
      : null;

    const itemAfter = itemBefore
      ? await this.findBacklogItemAfterOf(itemBefore, excludeIds)
      : await this.findFirstBacklogItem(backlogId, excludeIds);

    return calculateOrder(itemBefore, itemAfter);
  }

  async findBacklogItemAfterOf(
    itemBefore: BacklogItem | null,
    excludeIds: number[],
  ) {
    return this.backlogItemRepo.findOne({
      where: {
        order: MoreThan(itemBefore.order),
        backlogId: itemBefore.backlogId,
        id: And(Not(In([...excludeIds, itemBefore.id]))),
      },
      order: { order: 'ASC' },
    });
  }

  async findFirstBacklogItem(backlogId: number, excludeIds: number[]) {
    return this.backlogItemRepo.findOne({
      where: {
        order: MoreThan(0),
        backlogId: backlogId,
        id: And(Not(In(excludeIds))),
      },
      order: { order: 'ASC' },
    });
  }

  async findBacklogItem(id: number, backlogId: number) {
    const item = await this.backlogItemRepo.findOne({
      where: { id, backlogId },
    });
    if (!item) throw new NotFoundException('Backlog item not found');
    return item;
  }
}

function calculateOrder(
  before: BacklogItem | null,
  after: BacklogItem | null,
): number {
  if (after && before) return (before.order + after.order) / 2;
  if (before) return before.order + 1;
  if (after) return after.order / 2;
  return 1;
}
