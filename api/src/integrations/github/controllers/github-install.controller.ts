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
import { QueryFailedError } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer } from 'src/core/auth';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { WorkspaceRole } from 'src/workspace/domain/values/workspace-role.value';
import { GithubInstallationRepository } from '../repositories';
import { GithubApiService } from '../services/github-api.service';
import { GithubUserOAuthService } from '../services/github-user-oauth.service';

@Controller('integrations/github/install')
export class GithubInstallController {
  constructor(
    private readonly config: AppConfig,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly githubApi: GithubApiService,
    private readonly githubUrls: GithubUserOAuthService,
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
    if (!this.config.GITHUB_APP_SLUG?.trim()) {
      return res.status(400).send('GITHUB_APP_SLUG is not configured.');
    }

    const workspaceId = Number(workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).send('workspaceId is required');
    }

    const member = await this.workspaceRepo.findMember(workspaceId, issuer.id);
    if (!member) throw new IssuerUserIsNotWorkspaceMember();
    if (
      member.role !== WorkspaceRole.ADMIN &&
      member.role !== WorkspaceRole.OWNER
    ) {
      throw new ForbiddenException(
        'Only workspace admins can install the GitHub App.',
      );
    }

    const state = randomBytes(16).toString('hex');
    res.cookie('github_install_state', state, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('github_install_workspace_id', String(workspaceId), {
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

    const url = this.githubUrls.getNewInstallationUrl(state);
    res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('installation_id') installationIdRaw: string | undefined,
    @Query('setup_action') _setupAction: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expectedState = req.cookies?.github_install_state as
      | string
      | undefined;
    const workspaceIdRaw = req.cookies?.github_install_workspace_id as
      | string
      | undefined;

    if (!expectedState || !state || expectedState !== state) {
      return res.status(400).send('Invalid OAuth state');
    }

    const workspaceId = Number(workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).send('Missing install workspace context');
    }

    if (!installationIdRaw?.trim()) {
      return res.status(400).send('Missing installation_id');
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
        return res
          .status(409)
          .send(
            'This GitHub App installation is already linked to another Epicstory workspace.',
          );
      }
      throw e;
    }

    res.clearCookie('github_install_state');
    res.clearCookie('github_install_workspace_id');

    const redirectPath = req.cookies?.oauth_redirect || '';
    if (redirectPath) res.clearCookie('oauth_redirect');

    const baseUrl = this.config.APP_URL.replace(/\/$/, '');
    const finalRedirect = redirectPath ? `${baseUrl}${redirectPath}` : baseUrl;
    res.redirect(finalRedirect);
  }
}
