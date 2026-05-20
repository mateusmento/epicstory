import { randomBytes } from 'crypto';
import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppConfig } from 'src/core/app.config';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer } from 'src/core/auth';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import { GithubUserConnectionRepository } from '../repositories';
import { GithubUserOAuthService } from '../services/github-user-oauth.service';

@Controller('integrations/github/user')
export class GithubUserOAuthController {
  constructor(
    private readonly config: AppConfig,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly userConnRepo: GithubUserConnectionRepository,
    private readonly oauth: GithubUserOAuthService,
    private readonly crypto: IntegrationTokenCryptoService,
  ) {}

  @Get('start')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async start(
    @Query('workspaceId') workspaceIdRaw: string,
    @Query('redirect') redirect: string | undefined,
    @Auth() issuer: Issuer,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!this.config.isGithubAppRegistrationComplete()) {
      return res
        .status(400)
        .send(
          'GitHub App is not configured (GITHUB_APP_ID / CLIENT_ID / SECRET).',
        );
    }

    const workspaceId = Number(workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).send('workspaceId is required');
    }

    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const state = randomBytes(16).toString('hex');
    res.cookie('github_user_oauth_state', state, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('github_user_oauth_workspace_id', String(workspaceId), {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('github_user_oauth_issuer_id', String(issuer.id), {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });

    if (redirect) {
      res.cookie('oauth_redirect', redirect, {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
        sameSite: 'lax',
      });
    }

    const url = this.oauth.getUserAuthorizeUrl(state);
    res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (oauthError) {
      const msg = errorDescription || oauthError;
      return res.status(400).send(`GitHub authorization failed: ${msg}`);
    }

    const expectedState = req.cookies?.github_user_oauth_state as
      | string
      | undefined;
    const workspaceIdRaw = req.cookies?.github_user_oauth_workspace_id as
      | string
      | undefined;
    const userIdRaw = req.cookies?.github_user_oauth_issuer_id as
      | string
      | undefined;

    if (!expectedState || !state || expectedState !== state) {
      return res.status(400).send('Invalid OAuth state');
    }

    const workspaceId = Number(workspaceIdRaw);
    const userId = Number(userIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).send('Missing OAuth workspace context');
    }
    if (!userId || Number.isNaN(userId)) {
      return res.status(400).send('Missing OAuth user context');
    }

    if (!code?.trim()) {
      return res.status(400).send('Missing authorization code');
    }

    const token = await this.oauth.exchangeCodeForToken(code.trim());
    const accessToken = token.access_token;
    if (!accessToken) {
      return res.status(400).send('Missing access_token from GitHub');
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

    res.clearCookie('github_user_oauth_state');
    res.clearCookie('github_user_oauth_workspace_id');
    res.clearCookie('github_user_oauth_issuer_id');

    const redirectPath = req.cookies?.oauth_redirect || '';
    if (redirectPath) res.clearCookie('oauth_redirect');

    const baseUrl = this.config.APP_URL.replace(/\/$/, '');
    const finalRedirect = redirectPath ? `${baseUrl}${redirectPath}` : baseUrl;
    res.redirect(finalRedirect);
  }
}
