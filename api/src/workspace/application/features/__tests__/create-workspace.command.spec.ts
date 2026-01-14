import { CommandBus } from '@nestjs/cqrs';
import { TestingModule } from '@nestjs/testing';
import { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import {
  createTestingModule,
  startPostgresTestContainer,
} from 'src/core/testing/database';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { CreateWorkspace } from '../workspace/create-workspace.command';

describe('Create workspace command', () => {
  let postgres: StartedPostgreSqlContainer;
  let module: TestingModule;
  let commandBus: CommandBus;

  beforeAll(async () => {
    postgres = await startPostgresTestContainer();
    module = await createTestingModule(postgres);
    commandBus = module.get(CommandBus);
  });

  it('should happly create workspace', async () => {
    const ISSUER_ID = 1;

    const WORKSPACE_NAME = 'My workspace';

    const workspace: Workspace = await commandBus.execute(
      new CreateWorkspace({ issuerId: ISSUER_ID, name: WORKSPACE_NAME }),
    );

    expect(workspace.name).toBe(WORKSPACE_NAME);
  });
});
