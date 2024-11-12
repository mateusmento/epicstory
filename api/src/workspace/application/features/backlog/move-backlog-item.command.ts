import { NotFoundException } from '@nestjs/common';
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
    await this.findBacklog(backlogId);
    const item = await this.findBacklogItem(backlogItemId, backlogId);

    const itemBefore = insertedAfterOfId
      ? await this.findBacklogItem(insertedAfterOfId, backlogId)
      : null;

    if (itemBefore) {
      this.moveNextTo(item, itemBefore);
    } else {
      this.placeAtTheTop(backlogId, item);
    }
  }

  private async placeAtTheTop(backlogId: number, item: BacklogItem) {
    const firstItem = await this.findFirstBacklogItem(backlogId);

    this.connectNodesFromPreviousPosition(item);

    const order = firstItem ? firstItem.order / 2 : 0;

    if (firstItem)
      await this.backlogItemRepo.update(
        { id: firstItem.id },
        { previousId: item.id },
      );

    await this.backlogItemRepo.update(
      { id: item.id },
      { order, nextId: firstItem?.id ?? null, previousId: null },
    );
  }

  private async moveNextTo(item: BacklogItem, itemBefore: BacklogItem) {
    const order = itemBefore.nextId
      ? (itemBefore.order + itemBefore.next.order) / 2
      : itemBefore.order + 1;

    this.connectNodesFromPreviousPosition(item);

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
      { order, nextId: itemBefore.nextId, previousId: itemBefore.id },
    );
  }

  private async connectNodesFromPreviousPosition(item: BacklogItem) {
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

  private async findBacklogItem(id: number, backlogId: number) {
    return this.backlogItemRepo.findOne({
      where: { id, backlogId },
      relations: { next: true },
    });
  }

  private async findFirstBacklogItem(backlogId: number) {
    return this.backlogItemRepo.findOne({
      where: { backlogId },
      order: { order: 'asc' },
      relations: { next: true },
    });
  }
}
