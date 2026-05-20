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

  /**
   * Always returns a frontend redirect URL so browser OAuth callbacks never render raw JSON errors.
   */
  async completeMemberLink(params: {
    code?: string;
    stateFromQuery?: string;
    oauthError?: string;
    errorDescription?: string;
  }): Promise<GithubUserOauthCallbackResult> {
    if (params.oauthError) {
      const sessOnError = this.pendingState.consumeUserOAuthState(
        params.stateFromQuery,
      );
      const msg = params.errorDescription || params.oauthError;
      return {
        finalRedirect: this.userOAuthReturnUrl(sessOnError?.oauthRedirect, {
          github_oauth_error: msg.slice(0, 1200),
        }),
      };
    }

    const sess = this.pendingState.consumeUserOAuthState(params.stateFromQuery);
    if (!sess) {
      return {
        finalRedirect: this.userOAuthReturnUrl(undefined, {
          github_oauth_error:
            'Invalid or expired session. Try linking again from Workspace → Integrations → GitHub.',
        }),
      };
    }

    const { workspaceId, userId, oauthRedirect: redirectAfter } = sess;

    if (!params.code?.trim()) {
      return {
        finalRedirect: this.userOAuthReturnUrl(redirectAfter, {
          github_oauth_error: 'Missing authorization code from GitHub.',
        }),
      };
    }

    let token;
    try {
      token = await this.oauth.exchangeCodeForToken(params.code.trim());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        finalRedirect: this.userOAuthReturnUrl(redirectAfter, {
          github_oauth_error: msg.slice(0, 1200),
        }),
      };
    }

    const accessToken = token.access_token?.trim();
    if (!accessToken) {
      return {
        finalRedirect: this.userOAuthReturnUrl(redirectAfter, {
          github_oauth_error: 'Missing access_token from GitHub.',
        }),
      };
    }

    let ghUser;
    try {
      ghUser = await this.oauth.fetchGithubUser(accessToken);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        finalRedirect: this.userOAuthReturnUrl(redirectAfter, {
          github_oauth_error: msg.slice(0, 1200),
        }),
      };
    }

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

    return {
      finalRedirect: this.userOAuthReturnUrl(redirectAfter, {
        github_oauth_success: '1',
      }),
    };
  }

  /** Builds absolute URL to the Epicstory frontend (`APP_URL` origin + optional path fragment). */
  private userOAuthReturnUrl(
    oauthRedirectPath: string | undefined,
    query: Record<string, string | undefined>,
  ): string {
    const baseOrigin = this.config.APP_URL.replace(/\/$/, '');
    const raw = oauthRedirectPath?.trim() ?? '';
    const path = raw.startsWith('/') ? raw : raw.length > 0 ? `/${raw}` : '/';
    const url = new URL(path, `${baseOrigin}/`);
    for (const [k, v] of Object.entries(query)) {
      if (v != null && String(v).length > 0) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }
}
