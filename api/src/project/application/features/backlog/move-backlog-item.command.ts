import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IsNumber, IsOptional } from 'class-validator';
import { patch } from 'src/core/objects';
import { BacklogItemService } from 'src/project/domain/services';
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
    private backlogItemService: BacklogItemService,
  ) {}

  @Transactional()
  async execute({ backlogId, backlogItemId, afterOf }: MoveBacklogItem) {
    if (backlogItemId === afterOf) {
      throw new BadRequestException('Can not insert backlog item after itself');
    }

    const backlog = await this.findBacklog(backlogId);
    const item = await this.findBacklogItem(backlogItemId);

    const itemBefore = afterOf ? await this.findBacklogItem(afterOf) : null;

    if (itemBefore && backlog.id !== itemBefore.backlogId)
      throw new BadRequestException(
        'Backlog item inserted after of does not belong to the target backlog',
      );

    if (itemBefore && item.projectId !== itemBefore.projectId)
      throw new BadRequestException(
        'Can not move backlog item to a different project',
      );

    const order = await this.backlogItemService.reorder(item, afterOf);

    // If moving within the same backlog to the exact same computed position, skip (idempotent)
    if (item.backlogId === backlogId && item.order === order) {
      return { itemBefore, item };
    }

    await this.backlogItemRepo.update(
      { id: item.id },
      {
        backlogId,
        order,
      },
    );

    return {
      itemBefore,
      item: await this.findBacklogItem(item.id),
    };
  }

  private async findBacklog(id: number) {
    const backlog = await this.backlogRepo.findOneBy({ id });
    if (!backlog) throw new NotFoundException('Backlog not found');
    return backlog;
  }

  private async findBacklogItem(id: number) {
    const item = await this.backlogItemRepo.findOne({
      where: { id },
      relations: { issue: true },
    });
    if (!item) throw new NotFoundException('Backlog item not found');
    return item;
  }
}
