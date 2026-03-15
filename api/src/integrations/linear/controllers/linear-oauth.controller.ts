import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { AppConfig } from 'src/core/app.config';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer } from 'src/core/auth';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import {
  LinearClientService,
  LinearOAuthService,
  LinearTokenCryptoService,
} from '../services';
import { LinearConnectionRepository } from '../repositories';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';

@Controller('integrations/linear/oauth')
export class LinearOAuthController {
  constructor(
    private config: AppConfig,
    private oauth: LinearOAuthService,
    private linearClient: LinearClientService,
    private crypto: LinearTokenCryptoService,
    private connectionRepo: LinearConnectionRepository,
    private workspaceRepo: WorkspaceRepository,
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
    const workspaceId = Number(workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).send('workspaceId is required');
    }

    // Ensure the issuer is a member of the workspace before starting OAuth.
    // (We keep admin enforcement as future work; existing CreateProject/CreateTeam commands will enforce admin where needed.)
    // This avoids creating connections for workspaces the user can’t access.
    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const state = randomBytes(16).toString('hex');

    res.cookie('linear_oauth_state', state, {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('linear_oauth_workspace_id', String(workspaceId), {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('linear_oauth_issuer_id', String(issuer.id), {
      httpOnly: true,
      maxAge: 5 * 60 * 1000,
      sameSite: 'lax',
    });

    if (redirect) {
      // Reuse the same cookie key Google OAuth uses, so the UI behavior is consistent.
      res.cookie('oauth_redirect', redirect, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: 'lax',
      });
    }

    const url = this.oauth.getAuthorizeUrl({ state, scope: 'read' });
    res.redirect(url);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expectedState = req.cookies?.linear_oauth_state as string | undefined;
    const workspaceIdRaw = req.cookies?.linear_oauth_workspace_id as
      | string
      | undefined;
    const issuerIdRaw = req.cookies?.linear_oauth_issuer_id as
      | string
      | undefined;

    if (!expectedState || !state || expectedState !== state) {
      return res.status(400).send('Invalid OAuth state');
    }

    const workspaceId = Number(workspaceIdRaw);
    if (!workspaceId || Number.isNaN(workspaceId)) {
      return res.status(400).send('Missing OAuth workspace context');
    }
    const issuerId = Number(issuerIdRaw);
    if (!issuerId || Number.isNaN(issuerId)) {
      return res.status(400).send('Missing OAuth issuer context');
    }

    const token = await this.oauth.exchangeCodeForToken(code);
    const accessToken = token.access_token;
    if (!accessToken) return res.status(400).send('Missing access_token');

    // Find org context via SDK (avoid handwritten GraphQL; keep resilient to SDK surface changes).
    const client = this.linearClient.create(accessToken);
    const awaitMaybe = async <T>(v: any): Promise<T | undefined> =>
      v && typeof v.then === 'function' ? await v : v;

    // Preferred: client.organization (SDK commonly exposes a single org for the token).
    const orgDirect: any = await awaitMaybe((client as any).organization);
    let org: { id: string; name: string } | undefined =
      orgDirect?.id && orgDirect?.name
        ? { id: orgDirect.id, name: orgDirect.name }
        : undefined;

    if (!org) {
      const viewer = await (client as any).viewer;
      const orgConn =
        (await awaitMaybe((viewer as any).organizations?.())) ??
        (await awaitMaybe((client as any).organizations?.({ first: 50 }))) ??
        (await awaitMaybe((client as any).organizations?.()));

      const orgs: Array<{ id: string; name: string }> =
        (orgConn as any)?.nodes ?? [];
      if (orgs.length) org = orgs[0];
    }

    if (!org) {
      return res
        .status(400)
        .send(
          'Could not determine Linear organization. Ensure your Linear OAuth app has access and try again.',
        );
    }

    const accessTokenEncrypted = this.crypto.encrypt(accessToken);
    const refreshTokenEncrypted = token.refresh_token
      ? this.crypto.encrypt(token.refresh_token)
      : null;
    const tokenExpiresAt =
      token.expires_in && token.expires_in > 0
        ? new Date(Date.now() + token.expires_in * 1000)
        : null;

    // Upsert by (workspace_id, linear_org_id)
    const existing = await this.connectionRepo.findOne({
      where: { workspaceId, linearOrgId: org.id },
    });

    const connection = existing
      ? Object.assign(existing, {
          linearOrgName: org.name,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          status: 'active',
          revokedAt: null,
        })
      : this.connectionRepo.create({
          workspaceId,
          userId: null,
          createdByUserId: issuerId,
          linearOrgId: org.id,
          linearOrgName: org.name,
          accessTokenEncrypted,
          refreshTokenEncrypted,
          tokenExpiresAt,
          status: 'active',
        });

    await this.connectionRepo.save(connection);

    // Clean up cookies
    res.clearCookie('linear_oauth_state');
    res.clearCookie('linear_oauth_workspace_id');
    res.clearCookie('linear_oauth_issuer_id');

    const redirectPath = req.cookies?.oauth_redirect || '';
    const baseUrl = this.config.APP_URL.replace(/\/$/, '');
    const finalRedirect = redirectPath ? `${baseUrl}${redirectPath}` : baseUrl;
    if (redirectPath) res.clearCookie('oauth_redirect');

    res.redirect(finalRedirect);
  }
}
