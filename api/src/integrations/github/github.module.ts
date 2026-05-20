import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { Project } from 'src/project/domain/entities/project.entity';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import * as controllers from './controllers';
import * as services from './services';
import {
  GithubInstallation,
  GithubUserConnection,
  GithubEpicstoryPrTimelineMarker,
  IssueGithubPullRequest,
  ProjectGithubRepo,
} from './entities';
import * as repositories from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GithubInstallation,
      GithubUserConnection,
      GithubEpicstoryPrTimelineMarker,
      IssueGithubPullRequest,
      ProjectGithubRepo,
      Project,
      Issue,
    ]),
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(repositories),
    ...Object.values(services),
    IntegrationTokenCryptoService,
  ],
  exports: [
    ...Object.values(repositories),
    ...Object.values(services),
    IntegrationTokenCryptoService,
  ],
})
export class GithubIntegrationModule {}
