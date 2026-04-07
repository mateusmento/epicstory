import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import {
  createTestingModule,
  startPostgresTestContainer,
  truncateTables,
} from 'src/core/testing/database';
import { User } from 'src/auth/domain/entities/user.entity';
import { Workspace, WorkspaceMember } from 'src/workspace/domain/entities';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import {
  CreateCalendarEvent,
  RemoveCalendarEvent,
} from 'src/calendar/features';
import { CalendarEvent } from 'src/calendar/entities';

describe('RemoveCalendarEvent', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let commandBus: CommandBus;
  let dataSource: DataSource;

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);
    commandBus = module.get(CommandBus);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await module?.close();
    await postgres?.stop();
  });

  beforeEach(async () => {
    await truncateTables(dataSource, [
      CalendarEvent as any,
      WorkspaceMember,
      Workspace,
      User,
    ]);
  });

  it('deletes unprocessed event owned by user', async () => {
    const userRepo = dataSource.getRepository(User);
    const wsRepo = dataSource.getRepository(Workspace);
    const wmRepo = dataSource.getRepository(WorkspaceMember);
    const seRepo = dataSource.getRepository(CalendarEvent);

    const u = await userRepo.save(
      User.fromOAuth({ name: 'U', email: 'u@test.com' }),
    );
    const ws = await wsRepo.save(Workspace.create({ name: 'WS' }));
    await wmRepo.save(
      WorkspaceMember.create({
        workspaceId: ws.id,
        userId: u.id,
        role: WorkspaceRole.ADMIN,
      }),
    );

    const created = await commandBus.execute(
      new CreateCalendarEvent({
        issuerId: u.id,
        workspaceId: ws.id,
        startsAt: new Date(Date.now() + 60_000),
        endsAt: new Date(Date.now() + 120_000),
        payload: { title: 'E' },
        participantIds: [u.id],
      }),
    );

    expect(await seRepo.count()).toBe(1);

    await commandBus.execute(
      new RemoveCalendarEvent({ id: created.id as any, userId: u.id }),
    );

    expect(await seRepo.count()).toBe(0);
  });
});
