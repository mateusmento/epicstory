import { BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  createTestingModule,
  startPostgresTestContainer,
} from 'src/core/testing/database';
import { CreateIssue } from 'src/project/application/features/issue/create-issue.command';
import { CreateIssueDependency } from 'src/project/application/features/issue/create-issue-dependency.command';
import { UpdateIssueSchedule } from 'src/project/application/features/issue/update-issue-schedule.command';
import { CreateProject } from 'src/project/application/features/project/create-project.command';
import { AddWorkspaceMember } from 'src/workspace/application/features/workspace/add-workspace-member.command';
import { CreateWorkspace } from 'src/workspace/application/features/workspace/create-workspace.command';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { TeamRepository } from 'src/workspace/infrastructure/repositories/team.repository';

describe('Issue timeline commands', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let commandBus: CommandBus;

  const ISSUER_ID = 2;
  const USER_ID = 1;

  function issuer(id: number): { id: number; name: string; email: string } {
    return { id, name: `user-${id}`, email: `user-${id}@test.local` };
  }

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);
    commandBus = module.get(CommandBus);
  });

  async function seedProject() {
    const workspace = await commandBus.execute(
      new CreateWorkspace({ issuerId: ISSUER_ID, name: 'Timeline workspace' }),
    );

    await commandBus.execute(
      new AddWorkspaceMember({
        issuerId: ISSUER_ID,
        workspaceId: workspace.id,
        userId: USER_ID,
        role: WorkspaceRole.ADMIN,
      }),
    );

    const teamRepo = module.get(TeamRepository);
    const team = await teamRepo.findOneByOrFail({
      workspaceId: workspace.id,
    });

    const project = await commandBus.execute(
      new CreateProject({
        issuerId: ISSUER_ID,
        name: 'Timeline project',
        workspaceId: workspace.id,
        teamId: team.id,
      }),
    );

    return { workspace, project };
  }

  async function createEpic(projectId: number, title: string) {
    return commandBus.execute(
      new CreateIssue({
        issuer: issuer(ISSUER_ID),
        projectId,
        title,
        issueType: 'epic',
      }),
    );
  }

  it('rejects schedule update for non-epic issues', async () => {
    const { project } = await seedProject();
    const task = await commandBus.execute(
      new CreateIssue({
        issuer: issuer(ISSUER_ID),
        projectId: project.id,
        title: 'Task',
      }),
    );

    await expect(
      commandBus.execute(
        new UpdateIssueSchedule({
          issueId: task.id,
          issuer: issuer(ISSUER_ID),
          startsAt: new Date('2026-07-01'),
          endsAt: new Date('2026-07-14'),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects inverted schedule range', async () => {
    const { project } = await seedProject();
    const epic = await createEpic(project.id, 'Epic A');

    await expect(
      commandBus.execute(
        new UpdateIssueSchedule({
          issueId: epic.id,
          issuer: issuer(ISSUER_ID),
          startsAt: new Date('2026-07-20'),
          endsAt: new Date('2026-07-01'),
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects self dependency', async () => {
    const { project } = await seedProject();
    const epic = await createEpic(project.id, 'Epic A');

    await expect(
      commandBus.execute(
        new CreateIssueDependency({
          issueId: epic.id,
          issuer: issuer(ISSUER_ID),
          dependsOnIssueId: epic.id,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects dependency cycle', async () => {
    const { project } = await seedProject();
    const epicA = await createEpic(project.id, 'Epic A');
    const epicB = await createEpic(project.id, 'Epic B');

    await commandBus.execute(
      new CreateIssueDependency({
        issueId: epicB.id,
        issuer: issuer(ISSUER_ID),
        dependsOnIssueId: epicA.id,
      }),
    );

    await expect(
      commandBus.execute(
        new CreateIssueDependency({
          issueId: epicA.id,
          issuer: issuer(ISSUER_ID),
          dependsOnIssueId: epicB.id,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
