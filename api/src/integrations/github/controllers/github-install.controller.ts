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
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer } from 'src/core/auth';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { GithubInstallFlowService } from '../services';

@Controller('integrations/github/install')
export class GithubInstallController {
  constructor(private readonly installFlow: GithubInstallFlowService) {}

  @Get('start')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async start(
    @Query('workspaceId') workspaceIdRaw: string,
    @Query('redirect') redirect: string | undefined,
    @Auth() issuer: Issuer,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.installFlow.beginAdminInstall({
      workspaceIdRaw,
      issuer,
      oauthRedirect: redirect,
    });

    res.cookie('github_install_state', result.state, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('github_install_workspace_id', String(result.workspaceId), {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });

    if (result.oauthRedirect) {
      res.cookie('oauth_redirect', result.oauthRedirect, {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
        sameSite: 'lax',
      });
    }

    res.redirect(result.redirectUrl);
  }

  @Get('callback')
  async callback(
    @Query('installation_id') installationIdRaw: string | undefined,
    @Query('setup_action') _setupAction: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { finalRedirect } = await this.installFlow.completeAdminInstall({
      installationIdRaw,
      stateFromQuery: state,
      cookieState: req.cookies?.github_install_state as string | undefined,
      cookieWorkspaceIdRaw: req.cookies?.github_install_workspace_id as
        | string
        | undefined,
      oauthRedirectCookie: req.cookies?.oauth_redirect as string | undefined,
    });

    res.clearCookie('github_install_state');
    res.clearCookie('github_install_workspace_id');

    const redirectPath = req.cookies?.oauth_redirect || '';
    if (redirectPath) res.clearCookie('oauth_redirect');

    res.redirect(finalRedirect);
  }
}
