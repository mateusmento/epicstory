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
import { GithubIssueBranchLinkReadService } from '../services/github-issue-branch-link-read.service';

@Controller('integrations/github/issues')
export class GithubIssueBranchesController {
  constructor(private readonly branchReads: GithubIssueBranchLinkReadService) {}

  @Get(':issueId/branches')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listBranches(
    @Param('issueId', ParseIntPipe) issueId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.branchReads.listForIssuer(issueId, issuer.id);
  }
}
