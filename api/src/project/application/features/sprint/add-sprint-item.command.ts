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

const sprintItemRelations = {
  issue: { assignees: true, labels: true },
} as const;

export class AddSprintItem {
  issuer: Issuer;
  sprintId: number;
  issueId: number;

  constructor(data: Partial<AddSprintItem> = {}) {
    patch(this, data);
  }
}

@CommandHandler(AddSprintItem)
export class AddSprintItemCommand implements ICommandHandler<AddSprintItem> {
  constructor(
    private sprintRepo: SprintRepository,
    private sprintItemRepo: SprintItemRepository,
    private sprintItemService: SprintItemService,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  async execute({ issuer, sprintId, issueId }: AddSprintItem) {
    const sprint = await this.sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');

    if (!(await this.workspaceRepo.memberExists(sprint.workspaceId, issuer.id)))
      throw new ForbiddenException('Not a workspace member');

    const existing = await this.sprintItemRepo.findOne({
      where: { sprintId, issueId },
    });
    if (existing) {
      return this.sprintItemRepo.findOne({
        where: { id: existing.id },
        relations: sprintItemRelations,
      });
    }

    const order = await this.sprintItemService.findNewOrder(sprintId, null);

    const saved = await this.sprintItemRepo.save({
      sprintId,
      issueId,
      order,
      completedStatus: null,
      destinationSprintId: null,
    });

    return this.sprintItemRepo.findOne({
      where: { id: saved.id },
      relations: sprintItemRelations,
    });
  }
}
