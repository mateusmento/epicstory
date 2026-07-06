import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { Issuer } from 'src/core/auth';
import {
  SprintItemRepository,
  SprintRepository,
} from 'src/project/infrastructure/repositories';
import {
  TeamRepository,
  WorkspaceRepository,
} from 'src/workspace/infrastructure/repositories';
import { SendNotification } from 'src/notifications/features/send-notification.command';
import { DataSource } from 'typeorm';

export class CompleteSprint {
  issuer: Issuer;
  sprintId: number;

  constructor(data: Partial<CompleteSprint> = {}) {
    patch(this, data);
  }
}

@CommandHandler(CompleteSprint)
export class CompleteSprintCommand implements ICommandHandler<CompleteSprint> {
  constructor(
    private sprintRepo: SprintRepository,
    private sprintItemRepo: SprintItemRepository,
    private teamRepo: TeamRepository,
    private workspaceRepo: WorkspaceRepository,
    private commandBus: CommandBus,
    private dataSource: DataSource,
  ) {}

  async execute({ issuer, sprintId }: CompleteSprint) {
    const sprint = await this.sprintRepo.findOne({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');
    if (sprint.status !== 'active')
      throw new BadRequestException('Sprint is not active');

    const team = await this.teamRepo.findOne({ where: { id: sprint.teamId } });
    if (!team) throw new NotFoundException('Team not found');

    if (!(await this.workspaceRepo.memberExists(team.workspaceId, issuer.id)))
      throw new ForbiddenException('Not a workspace member');

    const items = await this.sprintItemRepo.find({
      where: { sprintId },
      relations: { issue: { assignees: true, labels: true } },
      order: { order: 'ASC' },
    });

    // Find next planned sprint to route in-progress items into
    const nextSprint = await this.sprintRepo.findOne({
      where: { teamId: sprint.teamId, status: 'planned' },
      order: { createdAt: 'ASC' },
    });

    await this.dataSource.transaction(async (manager) => {
      for (const item of items) {
        const issueStatus = item.issue?.status ?? 'todo';
        const snapshot = issueStatus;
        let destination: number | null = null;

        if (issueStatus === 'doing' && nextSprint) {
          destination = nextSprint.id;
          // Create a sprint item in the destination sprint if not already there
          const exists = await manager.findOne(this.sprintItemRepo.target, {
            where: { sprintId: nextSprint.id, issueId: item.issueId },
          });
          if (!exists) {
            await manager.save(this.sprintItemRepo.target, {
              sprintId: nextSprint.id,
              issueId: item.issueId,
              order: item.order,
              completedStatus: null,
              destinationSprintId: null,
            });
          }
        }

        await manager.update(this.sprintItemRepo.target, item.id, {
          completedStatus: snapshot,
          destinationSprintId: destination,
        });
        item.completedStatus = snapshot;
        item.destinationSprintId = destination;
      }

      await manager.update(this.sprintRepo.target, sprintId, {
        status: 'completed',
      });

      // Auto-promote planned → active and create next upcoming sprint
      const cadence = team.sprintCadenceDays ?? 14;
      const sprintRepo = manager.getRepository(this.sprintRepo.target);

      let promoted = nextSprint;
      if (promoted) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + cadence * 24 * 60 * 60 * 1000);
        await sprintRepo.update(promoted.id, {
          status: 'active',
          startsAt: now,
          endsAt,
        });
        promoted.status = 'active';
        promoted.startsAt = now;
        promoted.endsAt = endsAt;
      } else {
        const now = new Date();
        const endsAt = new Date(now.getTime() + cadence * 24 * 60 * 60 * 1000);
        const count = await sprintRepo.count({
          where: { teamId: sprint.teamId },
        });
        promoted = await sprintRepo.save(
          sprintRepo.create({
            teamId: sprint.teamId,
            workspaceId: team.workspaceId,
            name: `Sprint ${count + 1}`,
            status: 'active',
            startsAt: now,
            endsAt,
            createdById: 0,
          }),
        );
      }

      // Create next planned sprint
      const referenceEnd = promoted.endsAt ?? new Date();
      const nextStartsAt = new Date(referenceEnd);
      const nextEndsAt = new Date(
        referenceEnd.getTime() + cadence * 24 * 60 * 60 * 1000,
      );
      const totalCount = await sprintRepo.count({
        where: { teamId: sprint.teamId },
      });
      await sprintRepo.save(
        sprintRepo.create({
          teamId: sprint.teamId,
          workspaceId: team.workspaceId,
          name: `Sprint ${totalCount + 1}`,
          status: 'planned',
          startsAt: nextStartsAt,
          endsAt: nextEndsAt,
          createdById: 0,
        }),
      );
    });

    sprint.status = 'completed';

    const members = await this.workspaceRepo.findMembers({
      workspaceId: team.workspaceId,
    });
    const memberIds = members.map((m) => m.userId).filter((id) => id != null);

    const doneCount = items.filter((i) => i.completedStatus === 'done').length;

    if (memberIds.length > 0) {
      await this.commandBus.execute(
        new SendNotification({
          type: 'sprint_completed',
          userIds: memberIds,
          workspaceId: team.workspaceId,
          payload: {
            sprintId: sprint.id,
            sprintName: sprint.name,
            teamId: team.id,
            workspaceId: team.workspaceId,
            completedBy: issuer as any,
            itemCount: items.length,
            completedItemCount: doneCount,
          } as any,
        }),
      );
    }

    return {
      sprint,
      items,
      nextSprintId: nextSprint?.id ?? null,
    };
  }
}
