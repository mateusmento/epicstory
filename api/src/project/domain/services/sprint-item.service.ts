import { Injectable, NotFoundException } from '@nestjs/common';
import { SprintItem } from 'src/project/domain/entities';
import { SprintItemRepository } from 'src/project/infrastructure/repositories';
import { And, In, MoreThan, Not } from 'typeorm';

@Injectable()
export class SprintItemService {
  constructor(private sprintItemRepo: SprintItemRepository) {}

  async findNewOrder(
    sprintId: number,
    afterOf: number | null,
    excludeIds: number[] = [],
  ): Promise<number> {
    const itemBefore = afterOf
      ? await this.findSprintItem(afterOf, sprintId)
      : null;

    const itemAfter = itemBefore
      ? await this.findSprintItemAfterOf(itemBefore, excludeIds)
      : await this.findFirstSprintItem(sprintId, excludeIds);

    return calculateOrder(itemBefore, itemAfter);
  }

  private async findSprintItem(id: number, sprintId: number) {
    const item = await this.sprintItemRepo.findOne({ where: { id, sprintId } });
    if (!item) throw new NotFoundException('Sprint item not found');
    return item;
  }

  private findSprintItemAfterOf(itemBefore: SprintItem, excludeIds: number[]) {
    return this.sprintItemRepo.findOne({
      where: {
        order: MoreThan(itemBefore.order),
        sprintId: itemBefore.sprintId,
        id: And(Not(In([...excludeIds, itemBefore.id]))),
      },
      order: { order: 'ASC' },
    });
  }

  private findFirstSprintItem(sprintId: number, excludeIds: number[]) {
    return this.sprintItemRepo.findOne({
      where: {
        order: MoreThan(0),
        sprintId,
        id: And(Not(In(excludeIds))),
      },
      order: { order: 'ASC' },
    });
  }
}

function calculateOrder(
  before: SprintItem | null,
  after: SprintItem | null,
): number {
  if (after && before) return (before.order + after.order) / 2;
  if (before) return before.order + 1;
  if (after) return after.order / 2;
  return 1;
}
