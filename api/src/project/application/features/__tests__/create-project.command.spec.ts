import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  createTestingModule,
  startPostgresTestContainer,
} from 'src/core/testing/database';
import { Project } from 'src/project/domain/entities/project.entity';
import { AddWorkspaceMember } from 'src/workspace/application/features/workspace/add-workspace-member.command';
import { CreateWorkspace } from 'src/workspace/application/features/workspace/create-workspace.command';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { CreateProject } from '../project/create-project.command';

describe('Create project command', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let commandBus: CommandBus;

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);
    commandBus = module.get(CommandBus);
  });

  it('should happly create project', async () => {
    const USER_ID = 1;
    const ISSUER_ID = 2;

    const workspace: Workspace = await commandBus.execute(
      new CreateWorkspace({ issuerId: ISSUER_ID, name: 'My workspace' }),
    );

    await commandBus.execute(
      new AddWorkspaceMember({
        issuerId: ISSUER_ID,
        workspaceId: workspace.id,
        userId: USER_ID,
        role: WorkspaceRole.ADMIN,
      }),
    );

    const PROJECT_NAME = 'My project';

    const project: Project = await commandBus.execute(
      new CreateProject({
        issuerId: ISSUER_ID,
        name: PROJECT_NAME,
        workspaceId: workspace.id,
      }),
    );

    expect(project.name).toBe(PROJECT_NAME);
    expect(project.workspaceId).toBe(workspace.id);
  });
});
