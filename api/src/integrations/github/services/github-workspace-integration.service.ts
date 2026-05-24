import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { IGithubInstallationRemoteVerification } from '@epicstory/contracts';
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

export type GithubIntegrationStatusResult = {
  appConfigured: boolean;
  installation: {
    id: number;
    githubInstallationId: string;
    accountLogin: string;
    accountType: string;
    suspendedAt: string | null;
  } | null;
  user: {
    githubUserId: string;
    githubLogin: string;
  } | null;
  installationRemoteVerification: IGithubInstallationRemoteVerification;
  installationRemoteVerificationDetail: string | null;
};

export type GithubRepositoryCatalogResult = {
  page: number;
  perPage: number;
  totalCount: number;
  hasNextPage: boolean;
  repositories: {
    githubRepoId: string;
    name: string;
    fullName: string;
    owner: string;
    defaultBranch: string | null;
    private: boolean;
    htmlUrl: string;
  }[];
};

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
  ): Promise<GithubIntegrationStatusResult> {
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
    perPageRaw: number,
  ): Promise<GithubRepositoryCatalogResult> {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, userId);
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
          workspaceId,
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
