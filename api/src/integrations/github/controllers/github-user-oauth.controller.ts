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
import { GithubUserOauthFlowService } from '../services';

@Controller('integrations/github/user')
export class GithubUserOAuthController {
  constructor(private readonly userOauthFlow: GithubUserOauthFlowService) {}

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

    res.cookie('github_user_oauth_state', result.state, {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('github_user_oauth_workspace_id', String(result.workspaceId), {
      httpOnly: true,
      maxAge: 15 * 60 * 1000,
      sameSite: 'lax',
    });
    res.cookie('github_user_oauth_issuer_id', String(result.userId), {
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

    res.redirect(result.authorizeUrl);
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
    const { finalRedirect } = await this.userOauthFlow.completeMemberLink({
      code,
      stateFromQuery: state,
      oauthError,
      errorDescription,
      cookieState: req.cookies?.github_user_oauth_state as string | undefined,
      cookieWorkspaceIdRaw: req.cookies?.github_user_oauth_workspace_id as
        | string
        | undefined,
      cookieUserIdRaw: req.cookies?.github_user_oauth_issuer_id as
        | string
        | undefined,
      oauthRedirectCookie: req.cookies?.oauth_redirect as string | undefined,
    });

    res.clearCookie('github_user_oauth_state');
    res.clearCookie('github_user_oauth_workspace_id');
    res.clearCookie('github_user_oauth_issuer_id');

    const redirectPath = req.cookies?.oauth_redirect || '';
    if (redirectPath) res.clearCookie('oauth_redirect');

    res.redirect(finalRedirect);
  }
}
