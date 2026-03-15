import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { Project as EpicProject } from 'src/project/domain/entities/project.entity';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import * as controllers from './controllers';
import {
  LinearConnection,
  LinearImportJob,
  LinearImportMismatch,
  LinearIssueMap,
  LinearProjectMap,
  LinearTeamMap,
  LinearUserMap,
} from './entities';
import * as jobs from './jobs';
import * as repositories from './repositories';
import * as services from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LinearConnection,
      LinearTeamMap,
      LinearProjectMap,
      LinearIssueMap,
      LinearUserMap,
      LinearImportJob,
      LinearImportMismatch,
      EpicProject,
    ]),
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(services),
    ...Object.values(repositories),
    ...Object.values(jobs),
  ],
  exports: [...Object.values(repositories), ...Object.values(services)],
})
export class LinearIntegrationModule {}
