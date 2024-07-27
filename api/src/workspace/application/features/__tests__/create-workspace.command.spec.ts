import { CommandBus } from '@nestjs/cqrs';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { CreateWorkspace } from '../create-workspace.command';
import { createWorkspaceTestingModule } from './workspace.test-module';

describe('Create workspace command', () => {
  let commandBus: CommandBus;

  beforeEach(async () => {
    const app = await createWorkspaceTestingModule().compile();
    await app.init();
    commandBus = app.get(CommandBus);
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
