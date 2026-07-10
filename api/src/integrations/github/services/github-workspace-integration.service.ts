import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  IGithubCatalogRepository,
  IGithubIntegrationStatus,
  IGithubInstallationRemoteVerification,
} from '@epicstory/contracts';
import type { IPage } from '@epicstory/contracts';
import { Page } from 'src/core/page';
import { AppConfig } from 'src/core/app.config';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  GithubInstallationRepository,
  GithubUserConnectionRepository,
} from '../repositories';
import { GithubApiService } from './github-api.service';
import { GithubCacheService } from './github-cache.service';
import { GithubWorkspaceInstallationService } from './github-workspace-installation.service';

@Injectable()
export class GithubWorkspaceIntegrationService {
  constructor(
    private readonly config: AppConfig,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly userConnRepo: GithubUserConnectionRepository,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly githubApi: GithubApiService,
    private readonly githubCache: GithubCacheService,
    private readonly githubWorkspaceInstallation: GithubWorkspaceInstallationService,
  ) {}

  async getIntegrationStatus(
    workspaceId: number,
    userId: number,
  ): Promise<IGithubIntegrationStatus> {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, userId);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const appConfigured = this.config.isGithubAppRegistrationComplete();
    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);
    const userConn = await this.userConnRepo.findActiveForWorkspaceUser(
      workspaceId,
      userId,
    );

    let installationRemoteVerification: IGithubInstallationRemoteVerification =
      'skipped_no_install_record';
    let installationRemoteVerificationDetail: string | null = null;

    if (!installation) {
      installationRemoteVerification = 'skipped_no_install_record';
    } else if (!appConfigured) {
      installationRemoteVerification = 'skipped_app_not_registered';
    } else if (!this.config.GITHUB_APP_PRIVATE_KEY?.trim()) {
      installationRemoteVerification = 'skipped_missing_private_key';
    } else {
      try {
        await this.githubApi.fetchInstallationAccount(
          installation.githubInstallationId,
        );
        installationRemoteVerification = 'ok';
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/\(\s*404\b|\b404\b|Not\s+Found/i.test(msg)) {
          installationRemoteVerification = 'missing_on_github';
        } else {
          installationRemoteVerification = 'error';
          installationRemoteVerificationDetail = msg.slice(0, 240);
        }
      }
    }

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
      installationRemoteVerification,
      installationRemoteVerificationDetail,
    };
  }

  async listInstallationRepositoryCatalog(
    workspaceId: number,
    userId: number,
    page: number,
    countRaw: number,
  ): Promise<IPage<IGithubCatalogRepository>> {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, userId);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);
    if (!installation) {
      throw new BadRequestException(
        'Workspace has no GitHub App installation yet.',
      );
    }

    const count = Math.min(100, Math.max(1, countRaw));
    const safePage = Math.max(0, page);

    try {
      const { total, content } =
        await this.githubApi.listInstallationRepositoriesPage(
          installation.githubInstallationId,
          safePage + 1,
          count,
          workspaceId,
        );

      return Page.fromResult(content, total, { page: safePage, count });
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

  async disconnectInstallationForWorkspace(
    workspaceId: number,
    userId: number,
  ): Promise<void> {
    const member = await this.workspaceRepo.findMember(workspaceId, userId);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (
      member.role !== WorkspaceRole.ADMIN &&
      member.role !== WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only workspace admins can remove the GitHub App installation.',
      );
    }

    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);
    if (installation && this.githubCache.shouldInvalidateOnAdminActions()) {
      await this.githubCache.purgeInstallationCaches(
        installation.githubInstallationId,
      );
    }

    await this.githubWorkspaceInstallation.removeInstallationForWorkspace(
      workspaceId,
    );
  }

  /** Privileged: remote uninstall + local GitHub rows for workspace purge. */
  async purgeGithubForWorkspaceDeletion(workspaceId: number): Promise<void> {
    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);
    if (installation) {
      try {
        await this.githubApi.uninstallInstallation(
          installation.githubInstallationId,
        );
      } catch (ex) {
        console.log(
          'WARNING: GitHub remote uninstall failed during workspace purge',
          ex,
        );
      }
      try {
        await this.githubCache.purgeInstallationCaches(
          installation.githubInstallationId,
        );
      } catch (ex) {
        console.log('WARNING: GitHub cache purge failed', ex);
      }
    }

    await this.userConnRepo.delete({ workspaceId });
    await this.githubWorkspaceInstallation.removeInstallationForWorkspace(
      workspaceId,
    );
  }

  async disconnectUserGitHubLink(
    workspaceId: number,
    userId: number,
  ): Promise<void> {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, userId);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const row = await this.userConnRepo.findActiveForWorkspaceUser(
      workspaceId,
      userId,
    );
    if (row) await this.userConnRepo.delete({ id: row.id });
  }
}
