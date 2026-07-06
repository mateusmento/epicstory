import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { Issuer } from 'src/core/auth';
import {
  SprintItemRepository,
  SprintRepository,
} from 'src/project/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';

export class RemoveSprintItem {
  issuer: Issuer;
  sprintItemId: number;

  constructor(data: Partial<RemoveSprintItem> = {}) {
    patch(this, data);
  }
}

@CommandHandler(RemoveSprintItem)
export class RemoveSprintItemCommand
  implements ICommandHandler<RemoveSprintItem>
{
  constructor(
    private sprintItemRepo: SprintItemRepository,
    private sprintRepo: SprintRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, sprintItemId }: RemoveSprintItem) {
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

    await this.sprintItemRepo.delete(sprintItemId);
  }
}
