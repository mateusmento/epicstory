import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { BacklogItem } from 'src/project/domain/entities';
import {
  BacklogItemRepository,
  BacklogRepository,
} from 'src/project/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class MoveBacklogItem {
  @IsNumber()
  backlogId: number;
  backlogItemId: number;
  @IsNumber()
  @IsOptional()
  afterOf: number;

  constructor(data: Partial<MoveBacklogItem>) {
    patch(this, data);
  }
}

@CommandHandler(MoveBacklogItem)
export class MoveBacklogItemCommand
  implements ICommandHandler<MoveBacklogItem>
{
  constructor(
    private backlogRepo: BacklogRepository,
    private backlogItemRepo: BacklogItemRepository,
  ) {}

  @Transactional()
  async execute({ backlogId, backlogItemId, afterOf }: MoveBacklogItem) {
    if (backlogItemId === afterOf) {
      throw new BadRequestException('Can not insert backlog item after itself');
    }

    const backlog = await this.findBacklog(backlogId);
    const item = await this.findBacklogItem(backlogItemId);

    const itemBefore = afterOf ? await this.findBacklogItem(afterOf) : null;

    if (itemBefore && itemBefore.nextId === item.id) {
      console.error('Can not move backlog item to same position');
      throw new BadRequestException(
        'Can not move backlog item to same position',
      );
    }

    if (itemBefore && backlog.id !== itemBefore.backlogId)
      throw new BadRequestException(
        'Backlog item inserted after of does not belong to the target backlog',
      );

    if (itemBefore && item.projectId !== itemBefore.projectId)
      throw new BadRequestException(
        'Can not move backlog item to a different project',
      );

    if (itemBefore) {
      this.moveNextToItem(item, itemBefore);
    } else {
      this.moveToTopOfBacklog(item, backlogId);
    }

    return {
      itemBefore,
      item,
    };
  }

  private async moveToTopOfBacklog(item: BacklogItem, backlogId: number) {
    const firstItem = await this.findFirstBacklogItem(backlogId);

    this.connectAdjacentNodes(item);

    const order = firstItem ? firstItem.order / 2 : 1;

    if (firstItem)
      await this.backlogItemRepo.update(
        { id: firstItem.id },
        { previousId: item.id },
      );

    await this.backlogItemRepo.update(
      { id: item.id },
      { backlogId, order, nextId: firstItem?.id ?? null, previousId: null },
    );
  }

  private async moveNextToItem(item: BacklogItem, itemBefore: BacklogItem) {
    const order = itemBefore.nextId
      ? (itemBefore.order + itemBefore.next.order) / 2
      : itemBefore.order + 1;

    this.connectAdjacentNodes(item);

    if (itemBefore.nextId)
      await this.backlogItemRepo.update(
        { id: itemBefore.nextId },
        { previousId: item.id },
      );

    await this.backlogItemRepo.update(
      { id: itemBefore.id },
      { nextId: item.id },
    );

    await this.backlogItemRepo.update(
      { id: item.id },
      {
        backlogId: itemBefore.backlogId,
        order,
        nextId: itemBefore.nextId,
        previousId: itemBefore.id,
      },
    );
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

  private async findBacklog(id: number) {
    const backlog = await this.backlogRepo.findOneBy({ id });
    if (!backlog) throw new NotFoundException('Backlog not found');
    return backlog;
  }

  private async findBacklogItem(id: number) {
    const item = this.backlogItemRepo.findOne({
      where: { id },
      relations: { next: true, issue: true },
    });
    if (!item) throw new NotFoundException('Backlog item not found');
    return item;
  }

  private async findFirstBacklogItem(backlogId: number) {
    return this.backlogItemRepo.findOne({
      where: { backlogId },
      order: { order: 'asc' },
      relations: { next: true },
    });
  }
  async snapshotAndValidate(backlogId: number, callback: any) {
    const fetchBacklogItems = async () => {
      return await this.backlogItemRepo.find({
        where: { backlogId },
        order: { order: 'ASC' },
      });
    };

    // Take snapshot at the beginning
    const initialState = await fetchBacklogItems();
    console.log('Initial State:', initialState);

    // Simulate the request or operation (replace with actual operation logic)
    const result = await callback();
    // await performOperation(); // Uncomment and replace with actual logic

    // Take snapshot at the end
    const finalState = await fetchBacklogItems();

    // Validate the linked list consistency
    const validateLinkedList = (items) => {
      const errors = [];

      // Create a map of items by their ID for quick lookup
      const itemMap = new Map();
      items.forEach((item) => itemMap.set(item.id, item));

      items.forEach((item) => {
        if (item.nextId) {
          const nextItem = itemMap.get(item.nextId);
          if (!nextItem || nextItem.previousId !== item.id) {
            errors.push(
              `Item ${item.id} points to nextId ${item.nextId}, but that item does not point back.`,
            );
          }
        }

        if (item.previousId) {
          const prevItem = itemMap.get(item.previousId);
          if (!prevItem || prevItem.nextId !== item.id) {
            errors.push(
              `Item ${item.id} points to previousId ${item.previousId}, but that item does not point forward.`,
            );
          }
        }
      });

      return errors;
    };

    const errors = validateLinkedList(finalState);

    if (errors.length > 0) {
      console.error('Validation Errors:', errors);
    } else {
      console.log('Validation passed: No issues found.');
    }

    return result;
  }
}
