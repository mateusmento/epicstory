import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { typeorm } from 'src/core/typeorm';
import { WorkspaceModule } from 'src/workspace/workspace.module';

export function createWorkspaceTestingModule() {
  return Test.createTestingModule({
    imports: [
      typeorm.createModule(
        typeorm.betterSqlite(() => ({
          database: ':memory:',
          logging: false,
        })),
      ),
      CoreModule,
      WorkspaceModule,
    ],
  });
}
