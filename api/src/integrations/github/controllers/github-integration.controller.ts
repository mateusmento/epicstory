import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { AppConfig } from 'src/core/app.config';
import {
  GithubInstallationRepository,
  GithubUserConnectionRepository,
} from '../repositories';

@Controller('integrations/github/workspaces')
export class GithubIntegrationController {
  constructor(
    private config: AppConfig,
    private installationRepo: GithubInstallationRepository,
    private userConnRepo: GithubUserConnectionRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  @Get(':workspaceId/status')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async getStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const appConfigured = this.config.isGithubAppRegistrationComplete();

    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);

    const userConn = await this.userConnRepo.findActiveForWorkspaceUser(
      workspaceId,
      issuer.id,
    );

    return {
      appConfigured,
      installation: installation
        ? {
            id: installation.id,
            githubInstallationId: installation.githubInstallationId,
            accountLogin: installation.accountLogin,
            accountType: installation.accountType,
            suspendedAt: installation.suspendedAt?.toISOString() ?? null,
          }
        : null,
      user: userConn
        ? {
            githubUserId: userConn.githubUserId,
            githubLogin: userConn.githubLogin,
          }
        : null,
    };
  }
}
