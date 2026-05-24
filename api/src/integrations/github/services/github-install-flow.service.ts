import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import type { Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  GithubInstallationRepository,
  GithubUserConnectionRepository,
} from '../repositories';
import { GithubApiService } from './github-api.service';
import { GithubCacheService } from './github-cache.service';
import { GithubUserOAuthService } from './github-user-oauth.service';
import { GithubOAuthPendingStateStore } from './github-oauth-pending-state.store';

export type GithubInstallStartResult = {
  state: string;
  workspaceId: number;
  redirectUrl: string;
  oauthRedirect?: string;
};

export type GithubInstallCallbackResult = {
  finalRedirect: string;
};

@Injectable()
export class GithubInstallFlowService {
  constructor(
    private readonly config: AppConfig,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly userConnRepo: GithubUserConnectionRepository,
    private readonly githubApi: GithubApiService,
    private readonly githubCache: GithubCacheService,
    private readonly githubUrls: GithubUserOAuthService,
    private readonly pendingState: GithubOAuthPendingStateStore,
  ) {}

  async beginAdminInstall(params: {
    workspaceIdRaw: string | undefined;
    issuer: Issuer;
    oauthRedirect?: string;
  }): Promise<GithubInstallStartResult> {
    if (!this.config.isGithubAppRegistrationComplete()) {
      throw new BadRequestException(
        'GitHub App is not configured (GITHUB_APP_ID / CLIENT_ID / SECRET).',
      );
    }
    if (!this.config.GITHUB_APP_SLUG?.trim()) {
      throw new BadRequestException('GITHUB_APP_SLUG is not configured.');
    }

    const workspaceId = Number(params.workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      throw new BadRequestException('workspaceId is required');
    }

    const member = await this.workspaceRepo.findMember(
      workspaceId,
      params.issuer.id,
    );
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (
      member.role !== WorkspaceRole.ADMIN &&
      member.role !== WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only workspace admins can install the GitHub App.',
      );
    }

    const state = this.pendingState.allocateInstallationState({
      workspaceId,
      installerUserId: params.issuer.id,
      oauthRedirect: params.oauthRedirect,
    });
    const redirectUrl = this.githubUrls.getNewInstallationUrl(state);

    return {
      state,
      workspaceId,
      redirectUrl,
      oauthRedirect: params.oauthRedirect,
    };
  }

  async completeAdminInstall(params: {
    stateFromQuery?: string;
    installationIdRaw?: string;
  }): Promise<GithubInstallCallbackResult> {
    const sess = await this.pendingState.consumeInstallationState(
      params.stateFromQuery,
    );
    if (!sess) {
      throw new BadRequestException(
        'Invalid or expired install session. Start the GitHub App install again from Workspace → Integrations → GitHub.',
      );
    }

    const { workspaceId, installerUserId, oauthRedirect: redirectAfter } = sess;

    const installationIdRaw = params.installationIdRaw;
    if (!installationIdRaw?.trim()) {
      throw new BadRequestException('Missing installation_id');
    }

    const installationId = installationIdRaw.trim();

    let accountLogin = 'unknown';
    let accountType = 'Unknown';
    let suspendedAt: Date | null = null;

    if (this.config.GITHUB_APP_PRIVATE_KEY?.trim()) {
      try {
        const meta =
          await this.githubApi.fetchInstallationAccount(installationId);
        accountLogin = meta.accountLogin;
        accountType = meta.accountType;
        suspendedAt = meta.suspendedAt;
      } catch {
        // Keep placeholders; operators can add a key and re-run or fix via support.
      }
    }

    const existing = await this.installationRepo.findByWorkspaceId(workspaceId);

    const row = existing
      ? Object.assign(existing, {
          githubInstallationId: installationId,
          accountLogin,
          accountType,
          suspendedAt,
        })
      : this.installationRepo.create({
          workspaceId,
          githubInstallationId: installationId,
          accountLogin,
          accountType,
          suspendedAt,
        });

    if (this.githubCache.shouldInvalidateOnAdminActions()) {
      await this.githubCache.purgeInstallationCaches(installationId);
    }

    try {
      await this.installationRepo.save(row);
    } catch (e: unknown) {
      const pgCode =
        e instanceof QueryFailedError
          ? (e as QueryFailedError & { driverError?: { code?: string } })
              .driverError?.code
          : undefined;
      if (pgCode === '23505') {
        throw new ConflictException(
          'This GitHub App installation is already linked to another Epicstory workspace.',
        );
      }
      throw e;
    }

    return {
      finalRedirect: await this.resolvePostInstallRedirect({
        workspaceId,
        installerUserId,
        oauthRedirect: redirectAfter,
      }),
    };
  }

  /**
   * After a successful workspace install, send the installer through member OAuth when they
   * are not linked yet (session cookie from install start is still in the browser).
   */
  private async resolvePostInstallRedirect(params: {
    workspaceId: number;
    installerUserId: number;
    oauthRedirect?: string;
  }): Promise<string> {
    const integrationsPath =
      params.oauthRedirect?.trim() ||
      `/${params.workspaceId}/settings/integrations/github`;

    const existing = await this.userConnRepo.findActiveForWorkspaceUser(
      params.workspaceId,
      params.installerUserId,
    );
    if (existing?.accessTokenEncrypted) {
      return this.buildFrontendRedirect(integrationsPath, {
        github_install_success: '1',
      });
    }

    return this.buildMemberOAuthStartRedirect(
      params.workspaceId,
      integrationsPath,
    );
  }

  private buildFrontendRedirect(
    path: string,
    query: Record<string, string>,
  ): string {
    const base = this.config.APP_URL.replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(normalized, `${base}/`);
    for (const [k, v] of Object.entries(query)) {
      if (v.length > 0) url.searchParams.set(k, v);
    }
    return url.toString();
  }

  /** Browser hits API `user/start` (JwtAuthGuard) — requires an active Epicstory session. */
  private buildMemberOAuthStartRedirect(
    workspaceId: number,
    integrationsPath: string,
  ): string {
    const apiBase = this.config.APP_URL.replace(/\/$/, '');
    const url = new URL(`${apiBase}/api/integrations/github/user/start`);
    url.searchParams.set('workspaceId', String(workspaceId));
    url.searchParams.set('redirect', integrationsPath);
    return url.toString();
  }
}
