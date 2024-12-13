import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { BacklogItem } from 'src/workspace/domain/entities';
import {
  BacklogItemRepository,
  BacklogRepository,
} from 'src/workspace/infrastructure/repositories';
import { Transactional } from 'typeorm-transactional';

export class MoveBacklogItem {
  @IsNumber()
  backlogId: number;
  backlogItemId: number;
  @IsNumber()
  @IsOptional()
  insertedAfterOfId: number;

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
  async execute({
    backlogId,
    backlogItemId,
    insertedAfterOfId,
  }: MoveBacklogItem) {
    if (backlogItemId === insertedAfterOfId) {
      throw new BadRequestException('Can not insert backlog item after itself');
    }

    const backlog = await this.findBacklog(backlogId);
    const item = await this.findBacklogItem(backlogItemId);

    const itemBefore = insertedAfterOfId
      ? await this.findBacklogItem(insertedAfterOfId)
      : null;

    if (itemBefore.nextId === item.id) {
      console.log();
      throw new Error('Can not move backlog item to same position');
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
      relations: { next: true },
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
}
