import { CommandBus } from '@nestjs/cqrs';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { WorkspaceMemberAlreadyExists } from 'src/workspace/domain/exceptions/workspace-member-already-exists';
import { AddWorkspaceMember } from '../add-workspace-member.command';
import { CreateWorkspace } from '../create-workspace.command';
import { createWorkspaceTestingModule } from './workspace.test-module';

describe('Create workspace member command', () => {
  let commandBus: CommandBus;

  beforeEach(async () => {
    const module = await createWorkspaceTestingModule().compile();
    await module.init();
    commandBus = module.get(CommandBus);
  });

  it('should happly create workspace member', async () => {
    const USER_ID = 1;
    const ISSUER_ID = 2;

    const workspace: Workspace = await commandBus.execute(
      new CreateWorkspace({ issuerId: ISSUER_ID, name: 'My workspace' }),
    );

    const member = await commandBus.execute(
      new AddWorkspaceMember({
        issuerId: ISSUER_ID,
        workspaceId: workspace.id,
        userId: USER_ID,
      }),
    );

    expect(member.workspaceId).toBe(workspace.id);
    expect(member.userId).toBe(USER_ID);
  });

  it('should not create workspace member that already exists', async () => {
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
      }),
    );

    expect(() =>
      commandBus.execute(
        new AddWorkspaceMember({
          issuerId: ISSUER_ID,
          workspaceId: workspace.id,
          userId: USER_ID,
        }),
      ),
    ).rejects.toThrow(WorkspaceMemberAlreadyExists);
  });
});
