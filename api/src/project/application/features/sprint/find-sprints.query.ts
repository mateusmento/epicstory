import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { patch } from 'src/core/objects';
import { SprintRepository } from 'src/project/infrastructure/repositories';
import type { SprintStatus } from 'src/project/domain/entities/sprint.entity';
import { TeamRepository } from 'src/workspace/infrastructure/repositories';
import { DataSource, EntityManager } from 'typeorm';
import { Sprint } from 'src/project/domain/entities/sprint.entity';

export class FindSprints {
  teamId: number;
  status?: SprintStatus;

  constructor(data: Partial<FindSprints> = {}) {
    patch(this, data);
  }
}

@QueryHandler(FindSprints)
export class FindSprintsQuery implements IQueryHandler<FindSprints> {
  constructor(
    private sprintRepo: SprintRepository,
    private teamRepo: TeamRepository,
    private dataSource: DataSource,
  ) {}

  private async ensureSprints(
    teamId: number,
    manager: EntityManager,
  ): Promise<void> {
    const sprintRepo = manager.getRepository(Sprint);
    const team = await this.teamRepo.findOne({ where: { id: teamId } });
    if (!team) return;
    const cadence = team.sprintCadenceDays ?? 14;

    const [activeSprint, allPlanned] = await Promise.all([
      sprintRepo.findOne({
        where: { teamId, status: 'active' },
        order: { createdAt: 'ASC' },
      }),
      sprintRepo.find({
        where: { teamId, status: 'planned' },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const countAll = await sprintRepo.count({ where: { teamId } });

    let activeSprintFinal = activeSprint;

    // 1. Ensure an active sprint exists
    if (!activeSprintFinal) {
      const oldest = allPlanned[0];
      if (oldest) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + cadence * 24 * 60 * 60 * 1000);
        await sprintRepo.update(oldest.id, {
          status: 'active',
          startsAt: now,
          endsAt,
        });
        oldest.status = 'active';
        oldest.startsAt = now;
        oldest.endsAt = endsAt;
        activeSprintFinal = oldest;
        allPlanned.shift();
      } else {
        const now = new Date();
        const endsAt = new Date(now.getTime() + cadence * 24 * 60 * 60 * 1000);
        const sprintCount = countAll + 1;
        activeSprintFinal = await sprintRepo.save(
          sprintRepo.create({
            teamId,
            workspaceId: team.workspaceId,
            name: `Sprint ${sprintCount}`,
            status: 'active',
            startsAt: now,
            endsAt,
            createdById: 0,
          }),
        );
      }
    }

    // 2. Ensure exactly one planned sprint exists
    const plannedAfterActive = allPlanned.filter(
      (s) => s.id !== activeSprintFinal!.id,
    );
    if (plannedAfterActive.length === 0) {
      const referenceEnd = activeSprintFinal.endsAt ?? new Date();
      const startsAt = new Date(referenceEnd);
      const endsAt = new Date(
        referenceEnd.getTime() + cadence * 24 * 60 * 60 * 1000,
      );
      const totalCount = await sprintRepo.count({ where: { teamId } });
      await sprintRepo.save(
        sprintRepo.create({
          teamId,
          workspaceId: team.workspaceId,
          name: `Sprint ${totalCount + 1}`,
          status: 'planned',
          startsAt,
          endsAt,
          createdById: 0,
        }),
      );
    } else if (plannedAfterActive.length > 1) {
      // Remove extras beyond the oldest one
      const extras = plannedAfterActive.slice(1);
      await sprintRepo.delete(extras.map((s) => s.id));
    }
  }

  async execute({ teamId, status }: FindSprints) {
    await this.dataSource.transaction((manager) =>
      this.ensureSprints(teamId, manager),
    );

    const qb = this.sprintRepo
      .createQueryBuilder('sprint')
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(si.id)::int', 'itemCount')
            .from('workspace.sprint_item', 'si')
            .where('si.sprint_id = sprint.id'),
        'itemCount',
      )
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(si.id)::int', 'completedItemCount')
            .from('workspace.sprint_item', 'si')
            .where('si.sprint_id = sprint.id')
            .andWhere("si.completed_status = 'done'"),
        'completedItemCount',
      )
      .where('sprint.teamId = :teamId', { teamId })
      .orderBy('sprint.createdAt', 'DESC');

    if (status) {
      qb.andWhere('sprint.status = :status', { status });
    }

    const { entities, raw } = await qb.getRawAndEntities();

    return entities.map((sprint, i) => ({
      ...sprint,
      itemCount: Number(raw[i]?.itemCount ?? 0),
      completedItemCount: Number(raw[i]?.completedItemCount ?? 0),
    }));
  }
}
