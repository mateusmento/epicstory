import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { Issuer } from 'src/core/auth';
import {
  SprintItemRepository,
  SprintRepository,
} from 'src/project/infrastructure/repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource } from 'typeorm';

export class UpdateSprintItemDestination {
  issuer: Issuer;
  sprintItemId: number;
  destinationSprintId: number | null;

  constructor(data: Partial<UpdateSprintItemDestination> = {}) {
    patch(this, data);
  }
}

@CommandHandler(UpdateSprintItemDestination)
export class UpdateSprintItemDestinationCommand
  implements ICommandHandler<UpdateSprintItemDestination>
{
  constructor(
    private sprintItemRepo: SprintItemRepository,
    private sprintRepo: SprintRepository,
    private workspaceRepo: WorkspaceRepository,
    private dataSource: DataSource,
  ) {}

  async execute({
    issuer,
    sprintItemId,
    destinationSprintId,
  }: UpdateSprintItemDestination) {
    const item = await this.sprintItemRepo.findOne({
      where: { id: sprintItemId },
    });
    if (!item) throw new NotFoundException('Sprint item not found');

    const parentSprint = await this.sprintRepo.findOne({
      where: { id: item.sprintId },
    });
    if (!parentSprint) throw new NotFoundException('Sprint not found');
    if (parentSprint.status !== 'completed')
      throw new BadRequestException(
        'Can only update destination for items from completed sprints',
      );

    if (
      !(await this.workspaceRepo.memberExists(
        parentSprint.workspaceId,
        issuer.id,
      ))
    )
      throw new ForbiddenException('Not a workspace member');

    await this.dataSource.transaction(async (manager) => {
      // Remove item from any previously assigned destination sprint
      if (item.destinationSprintId !== null) {
        await manager.delete(this.sprintItemRepo.target, {
          sprintId: item.destinationSprintId,
          issueId: item.issueId,
        });
      }

      // Add item to new destination sprint if not null
      if (destinationSprintId !== null) {
        const targetSprint = await manager.findOne(this.sprintRepo.target, {
          where: { id: destinationSprintId },
        });
        if (!targetSprint)
          throw new NotFoundException('Destination sprint not found');

        const alreadyInTarget = await manager.findOne(
          this.sprintItemRepo.target,
          { where: { sprintId: destinationSprintId, issueId: item.issueId } },
        );
        if (!alreadyInTarget) {
          await manager.save(this.sprintItemRepo.target, {
            sprintId: destinationSprintId,
            issueId: item.issueId,
            order: item.order,
            completedStatus: null,
            destinationSprintId: null,
          });
        }
      }

      await manager.update(this.sprintItemRepo.target, sprintItemId, {
        destinationSprintId,
      });
    });

    return this.sprintItemRepo.findOne({ where: { id: sprintItemId } });
  }
}
