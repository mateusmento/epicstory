import { CommandBus } from '@nestjs/cqrs';
import { CreateProject } from '../create-project.command';
import { Workspace } from 'src/workspace/domain/entities/workspace.entity';
import { CreateWorkspace } from '../create-workspace.command';
import { Project } from 'src/workspace/domain/entities/project.entity';
import { createWorkspaceTestingModule } from './workspace.test-module';
import { AddWorkspaceMember } from '../add-workspace-member.command';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';

describe('Create project command', () => {
  let commandBus: CommandBus;

  beforeEach(async () => {
    const app = await createWorkspaceTestingModule().compile();
    await app.init();
    commandBus = app.get(CommandBus);
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
