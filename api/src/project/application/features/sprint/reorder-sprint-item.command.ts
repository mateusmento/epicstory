import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { Issuer } from 'src/core/auth';
import {
  SprintItemRepository,
  SprintRepository,
} from 'src/project/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { SprintItemService } from 'src/project/domain/services/sprint-item.service';

export class ReorderSprintItem {
  issuer: Issuer;
  sprintItemId: number;
  afterOf: number | null;

  constructor(data: Partial<ReorderSprintItem> = {}) {
    patch(this, data);
  }
}

@CommandHandler(ReorderSprintItem)
export class ReorderSprintItemCommand
  implements ICommandHandler<ReorderSprintItem>
{
  constructor(
    private sprintItemRepo: SprintItemRepository,
    private sprintRepo: SprintRepository,
    private sprintItemService: SprintItemService,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, sprintItemId, afterOf }: ReorderSprintItem) {
    const item = await this.sprintItemRepo.findOne({
      where: { id: sprintItemId },
    });
    if (!item) throw new NotFoundException('Sprint item not found');

    const sprint = await this.sprintRepo.findOne({
      where: { id: item.sprintId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');

    if (!(await this.workspaceRepo.memberExists(sprint.workspaceId, issuer.id)))
      throw new ForbiddenException('Not a workspace member');

    const order = await this.sprintItemService.findNewOrder(
      item.sprintId,
      afterOf,
      [sprintItemId],
    );

    await this.sprintItemRepo.update(sprintItemId, { order });
    return this.sprintItemRepo.findOne({ where: { id: sprintItemId } });
  }
}
