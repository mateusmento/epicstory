import {
  BadRequestException,
  Controller,
  Delete,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { AppConfig } from 'src/core/app.config';
import {
  GithubInstallationRepository,
  GithubUserConnectionRepository,
} from '../repositories';
import { GithubInstallation, ProjectGithubRepo } from '../entities';
import { GithubApiService } from '../services/github-api.service';

@Controller('integrations/github/workspaces')
export class GithubIntegrationController {
  constructor(
    private readonly config: AppConfig,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly userConnRepo: GithubUserConnectionRepository,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly githubApi: GithubApiService,
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

  /**
   * Lists repositories visible to the workspace’s GitHub App installation (paginated catalogue).
   */
  @Get(':workspaceId/repositories')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listRepositories(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(30), ParseIntPipe)
    perPageRaw: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);
    if (!installation) {
      throw new BadRequestException(
        'Workspace has no GitHub App installation yet.',
      );
    }

    const perPage = Math.min(100, Math.max(1, perPageRaw));
    const safePage = Math.max(1, page);

    try {
      const { totalCount, repositories } =
        await this.githubApi.listInstallationRepositoriesPage(
          installation.githubInstallationId,
          safePage,
          perPage,
        );

      return {
        page: safePage,
        perPage,
        totalCount,
        hasNextPage: safePage * perPage < totalCount,
        repositories: repositories.map((r) => ({
          githubRepoId: r.githubRepoId,
          name: r.name,
          fullName: r.fullName,
          owner: r.owner,
          defaultBranch: r.defaultBranch,
          private: r.private,
          htmlUrl: r.htmlUrl,
        })),
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('GITHUB_APP_PRIVATE_KEY') && msg.includes('required')) {
        throw new ServiceUnavailableException(
          'GitHub catalogue requires GITHUB_APP_PRIVATE_KEY on the API.',
        );
      }
      throw new BadRequestException(msg);
    }
  }

  /**
   * Removes the workspace GitHub App installation and all project→repo links for this workspace
   * (links are only valid while an installation exists).
   */
  @Delete(':workspaceId/installation')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async disconnectInstallation(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (
      member.role !== WorkspaceRole.ADMIN &&
      member.role !== WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only workspace admins can remove the GitHub App installation.',
      );
    }

    await this.installationRepo.manager.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .delete()
        .from(ProjectGithubRepo)
        .where(
          'project_id IN (SELECT id FROM workspace.workspace_project WHERE workspace_id = :wid)',
        )
        .setParameter('wid', workspaceId)
        .execute();
      await em.delete(GithubInstallation, { workspaceId });
    });
  }

  @Delete(':workspaceId/user')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async disconnectUser(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const row = await this.userConnRepo.findActiveForWorkspaceUser(
      workspaceId,
      issuer.id,
    );
    if (row) await this.userConnRepo.delete({ id: row.id });
  }
}
