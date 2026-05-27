import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import * as controllers from './controllers';
import * as jobs from './jobs';
import * as services from './services';
import { GithubIssueBranchService } from './services/github-issue-branch.service';
import {
  GithubEpicstoryPrTimelineMarker,
  GithubInstallation,
  GithubUserConnection,
  GithubWebhookDeliveryReceipt,
  IssueGithubPullRequest,
  IssueGithubBranch,
} from './entities';
import * as repositories from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GithubInstallation,
      GithubUserConnection,
      GithubEpicstoryPrTimelineMarker,
      GithubWebhookDeliveryReceipt,
      IssueGithubPullRequest,
      IssueGithubBranch,
      Issue,
    ]),
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [
    ...Object.values(repositories),
    ...Object.values(services),
    ...Object.values(jobs),
    IntegrationTokenCryptoService,
  ],
  exports: [
    ...Object.values(repositories),
    ...Object.values(services),
    IntegrationTokenCryptoService,
    GithubIssueBranchService,
  ],
})
export class GithubIntegrationModule {}
