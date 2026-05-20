import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import * as controllers from './controllers';
import {
  GithubInstallation,
  GithubUserConnection,
  ProjectGithubRepo,
} from './entities';
import * as repositories from './repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GithubInstallation,
      GithubUserConnection,
      ProjectGithubRepo,
    ]),
    WorkspaceModule,
    AuthModule,
  ],
  controllers: [...Object.values(controllers)],
  providers: [...Object.values(repositories), IntegrationTokenCryptoService],
  exports: [...Object.values(repositories), IntegrationTokenCryptoService],
})
export class GithubIntegrationModule {}
