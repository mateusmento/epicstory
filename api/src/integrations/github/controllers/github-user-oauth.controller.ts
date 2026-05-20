import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer } from 'src/core/auth';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  GithubInstallFlowService,
  GithubUserOauthFlowService,
} from '../services';

@Controller('integrations/github/user')
export class GithubUserOAuthController {
  constructor(
    private readonly userOauthFlow: GithubUserOauthFlowService,
    private readonly installFlow: GithubInstallFlowService,
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
    const result = await this.userOauthFlow.beginMemberLink({
      workspaceIdRaw,
      issuer,
      oauthRedirect: redirect,
    });
    res.redirect(result.authorizeUrl);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('installation_id') installationIdRaw: string | undefined,
    @Query('error') oauthError: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    /**
     * GitHub App **Setup URL** is often mis-pointed at the user OAuth callback.
     * Installs return `installation_id` + `state` (install pending), not `code`.
     */
    if (installationIdRaw?.trim()) {
      const { finalRedirect } = await this.installFlow.completeAdminInstall({
        installationIdRaw,
        stateFromQuery: state,
      });
      res.redirect(finalRedirect);
      return;
    }

    const { finalRedirect } = await this.userOauthFlow.completeMemberLink({
      code,
      stateFromQuery: state,
      oauthError,
      errorDescription,
    });

    res.redirect(finalRedirect);
  }
}
