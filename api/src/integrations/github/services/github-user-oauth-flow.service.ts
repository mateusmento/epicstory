import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfig } from 'src/core/app.config';
import type { Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import { GithubUserConnectionRepository } from '../repositories';
import { GithubUserOAuthService } from './github-user-oauth.service';
import { GithubOAuthPendingStateStore } from './github-oauth-pending-state.store';

export type GithubUserOauthStartResult = {
  state: string;
  workspaceId: number;
  userId: number;
  authorizeUrl: string;
  oauthRedirect?: string;
};

export type GithubUserOauthCallbackResult = {
  finalRedirect: string;
};

@Injectable()
export class GithubUserOauthFlowService {
  constructor(
    private readonly config: AppConfig,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly userConnRepo: GithubUserConnectionRepository,
    private readonly oauth: GithubUserOAuthService,
    private readonly crypto: IntegrationTokenCryptoService,
    private readonly pendingState: GithubOAuthPendingStateStore,
  ) {}

  async beginMemberLink(params: {
    workspaceIdRaw: string | undefined;
    issuer: Issuer;
    oauthRedirect?: string;
  }): Promise<GithubUserOauthStartResult> {
    if (!this.config.isGithubAppRegistrationComplete()) {
      throw new BadRequestException(
        'GitHub App is not configured (GITHUB_APP_ID / CLIENT_ID / SECRET).',
      );
    }

    const workspaceId = Number(params.workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      throw new BadRequestException('workspaceId is required');
    }

    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      params.issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const state = this.pendingState.allocateUserOAuthState({
      workspaceId,
      userId: params.issuer.id,
      oauthRedirect: params.oauthRedirect,
    });
    const authorizeUrl = this.oauth.getUserAuthorizeUrl(state);

    return {
      state,
      workspaceId,
      userId: params.issuer.id,
      authorizeUrl,
      oauthRedirect: params.oauthRedirect,
    };
  }

  async completeMemberLink(params: {
    code?: string;
    stateFromQuery?: string;
    oauthError?: string;
    errorDescription?: string;
  }): Promise<GithubUserOauthCallbackResult> {
    if (params.oauthError) {
      const msg = params.errorDescription || params.oauthError;
      throw new BadRequestException(`GitHub authorization failed: ${msg}`);
    }

    const sess = this.pendingState.consumeUserOAuthState(params.stateFromQuery);
    if (!sess) {
      throw new BadRequestException(
        'Invalid or expired session. Try linking your GitHub account again from Workspace → Integrations → GitHub.',
      );
    }

    const { workspaceId, userId, oauthRedirect: redirectAfter } = sess;

    if (!params.code?.trim()) {
      throw new BadRequestException('Missing authorization code');
    }

    const token = await this.oauth.exchangeCodeForToken(params.code.trim());
    const accessToken = token.access_token;
    if (!accessToken) {
      throw new BadRequestException('Missing access_token from GitHub');
    }

    const ghUser = await this.oauth.fetchGithubUser(accessToken);

    const accessTokenEncrypted = this.crypto.encrypt(accessToken);
    const refreshTokenEncrypted =
      this.config.GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED &&
      token.refresh_token?.trim()
        ? this.crypto.encrypt(token.refresh_token.trim())
        : null;
    const tokenExpiresAt =
      token.expires_in != null && token.expires_in > 0
        ? new Date(Date.now() + token.expires_in * 1000)
        : null;

    const existing = await this.userConnRepo.findOne({
      where: { workspaceId, userId },
      order: { id: 'DESC' },
    });

    const row = existing
      ? Object.assign(existing, {
          githubUserId: ghUser.id,
          githubLogin: ghUser.login,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          status: 'active',
          revokedAt: null,
        })
      : this.userConnRepo.create({
          workspaceId,
          userId,
          githubUserId: ghUser.id,
          githubLogin: ghUser.login,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          status: 'active',
        });

    await this.userConnRepo.save(row);

    const baseUrl = this.config.APP_URL.replace(/\/$/, '');
    const redirectPath = redirectAfter || '';
    const finalRedirect = redirectPath ? `${baseUrl}${redirectPath}` : baseUrl;

    return { finalRedirect };
  }
}
