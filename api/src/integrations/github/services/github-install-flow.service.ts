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
import { GithubInstallationRepository } from '../repositories';
import { GithubApiService } from './github-api.service';
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
    private readonly githubApi: GithubApiService,
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
    const sess = this.pendingState.consumeInstallationState(
      params.stateFromQuery,
    );
    if (!sess) {
      throw new BadRequestException(
        'Invalid or expired install session. Start the GitHub App install again from Workspace → Integrations → GitHub.',
      );
    }

    const { workspaceId, oauthRedirect: redirectAfter } = sess;

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

    const baseUrl = this.config.APP_URL.replace(/\/$/, '');
    const redirectPath = redirectAfter || '';
    const finalRedirect = redirectPath ? `${baseUrl}${redirectPath}` : baseUrl;

    return { finalRedirect };
  }
}
