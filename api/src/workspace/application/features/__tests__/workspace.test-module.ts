import { Test } from '@nestjs/testing';
import { createTypeOrmModule } from 'src/core/typeorm';
import { WorkspaceModule } from 'src/workspace/workspace.module';

export function createWorkspaceTestingModule() {
  return Test.createTestingModule({
    imports: [
      createTypeOrmModule(async () => ({
        database: ':memory:',
        logging: false,
      })),
      WorkspaceModule,
    ],
  });
}
