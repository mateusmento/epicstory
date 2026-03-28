import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { ScheduledEvent } from 'src/notifications/entities/scheduled-event.entity';
import { NotificationsCronjob } from 'src/notifications/jobs/notifications.cronjob';
import {
  CreateScheduledMeeting,
  GetScheduledMeetingOccurrence,
} from '../index';
import {
  ScheduledMeeting,
  ScheduledMeetingOccurrence,
  Meeting,
} from 'src/channel/domain/entities';

describe('Scheduled meetings', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let commandBus: CommandBus;
  let queryBus: QueryBus;
  let dataSource: DataSource;
  let cron: NotificationsCronjob;

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
    dataSource = module.get(DataSource);
    cron = module.get(NotificationsCronjob);
  });

  afterAll(async () => {
    await module?.close();
    await postgres?.stop();
  });

  beforeEach(async () => {
    await truncateTables(dataSource, [
      ScheduledEvent as any,
      Meeting,
      ScheduledMeetingOccurrence,
      ScheduledMeeting,
      WorkspaceMember,
      Workspace,
      User,
    ]);
  });

  async function seedWorkspaceWithMembers() {
    const userRepo = dataSource.getRepository(User);
    const workspaceRepo = dataSource.getRepository(Workspace);
    const memberRepo = dataSource.getRepository(WorkspaceMember);

    const u1 = await userRepo.save(
      User.fromOAuth({ name: 'User 1', email: 'u1@test.com' }),
    );
    const u2 = await userRepo.save(
      User.fromOAuth({ name: 'User 2', email: 'u2@test.com' }),
    );

    const ws = await workspaceRepo.save(Workspace.create({ name: 'WS' }));

    await memberRepo.save(
      WorkspaceMember.create({
        workspaceId: ws.id,
        userId: u1.id,
        role: WorkspaceRole.ADMIN,
      }),
    );
    await memberRepo.save(
      WorkspaceMember.create({
        workspaceId: ws.id,
        userId: u2.id,
        role: WorkspaceRole.COLLABORATOR,
      }),
    );

    return { ws, u1, u2 };
  }

  it('creates occurrences + reminder scheduled events (recurring)', async () => {
    const { ws, u1, u2 } = await seedWorkspaceWithMembers();

    const startsAt = new Date();
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const res = await commandBus.execute(
      new CreateScheduledMeeting({
        workspaceId: ws.id,
        issuerId: u1.id,
        title: 'Weekly sync',
        description: 'Test meeting',
        startsAt,
        endsAt,
        isPublic: true,
        notifyMinutesBefore: 1,
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          byWeekday: [startsAt.getDay()],
        },
        participantIds: [u2.id],
      }),
    );

    expect(res.scheduledMeetingId).toBeTruthy();
    expect(res.occurrences.length).toBeGreaterThan(1);

    const seRepo = dataSource.getRepository(ScheduledEvent);
    const count = await seRepo.count();

    // Participants include u1 (issuer) + u2
    expect(count).toBe(res.occurrences.length * 2);
  });

  it('enforces private meeting access (standalone)', async () => {
    const { ws, u1, u2 } = await seedWorkspaceWithMembers();

    const startsAt = new Date();
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const created = await commandBus.execute(
      new CreateScheduledMeeting({
        workspaceId: ws.id,
        issuerId: u1.id,
        title: 'Private',
        startsAt,
        endsAt,
        isPublic: false,
        notifyMinutesBefore: 1,
        recurrence: { frequency: 'daily', interval: 1 },
        participantIds: [u1.id], // only u1 invited
      }),
    );

    const occId = created.occurrences[0].id;

    await expect(
      queryBus.execute(
        new GetScheduledMeetingOccurrence({
          occurrenceId: occId,
          issuerId: u2.id,
        }),
      ),
    ).rejects.toBeTruthy();
  });

  it('cronjob creates meeting session idempotently for reminder events', async () => {
    const { ws, u1 } = await seedWorkspaceWithMembers();

    const startsAt = new Date(Date.now() - 5 * 60 * 1000);
    startsAt.setSeconds(0, 0);
    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);

    const created = await commandBus.execute(
      new CreateScheduledMeeting({
        workspaceId: ws.id,
        issuerId: u1.id,
        title: 'Due now',
        startsAt,
        endsAt,
        isPublic: true,
        notifyMinutesBefore: 0,
        recurrence: { frequency: 'daily', interval: 1 },
        participantIds: [u1.id],
      }),
    );

    const occId = created.occurrences[0].id;
    const occRepo = dataSource.getRepository(ScheduledMeetingOccurrence);

    // Before cron: session may or may not exist; ensure it doesn't.
    const before = await occRepo.findOne({ where: { id: occId as any } });
    expect(before?.meetingId ?? null).toBeNull();

    // Run cron twice; should create only one meeting row.
    await cron.handleCron();
    await cron.handleCron();

    const after = await occRepo.findOne({ where: { id: occId as any } });
    expect(after?.meetingId).toBeTruthy();

    const meetingRepo = dataSource.getRepository(Meeting);
    const meetings = await meetingRepo.find();
    expect(meetings.length).toBe(1);
  });
});
