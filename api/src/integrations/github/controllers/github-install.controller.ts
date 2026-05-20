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
    res.redirect(result.redirectUrl);
  }

  @Get('callback')
  async callback(
    @Query('installation_id') installationIdRaw: string | undefined,
    @Query('setup_action') _setupAction: string | undefined,
    @Query('state') state: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { finalRedirect } = await this.installFlow.completeAdminInstall({
      installationIdRaw,
      stateFromQuery: state,
    });

    res.redirect(finalRedirect);
  }
}
