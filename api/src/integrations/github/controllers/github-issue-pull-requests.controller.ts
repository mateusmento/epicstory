import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { GithubIssuePullRequestReadService } from '../services';

@Controller('integrations/github/issues')
export class GithubIssuePullRequestsController {
  constructor(
    private readonly issuePullReads: GithubIssuePullRequestReadService,
  ) {}

  @Get(':issueId/pull-requests')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listPullRequests(
    @Param('issueId', ParseIntPipe) issueId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.issuePullReads.listForIssuer(issueId, issuer.id);
  }
}
