import { Test } from '@nestjs/testing';
import { createAppModule } from 'src/app.module';
import { WorkspaceModule } from 'src/workspace/workspace.module';

export function createWorkspaceTestingModule() {
  return Test.createTestingModule({
    imports: [
      createAppModule({
        type: 'better-sqlite3',
        database: ':memory:',
        logging: false,
      }),
      WorkspaceModule,
    ],
  });
}
