import {
  Controller,
  DefaultValuePipe,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { GithubIssueBranchService } from '../services';

@Controller('integrations/github/workspaces/:workspaceId/repos')
export class GithubRepositoryBranchesController {
  constructor(private readonly issueBranches: GithubIssueBranchService) {}

  @Get(':owner/:repoName/branches')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listBranches(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('owner') owner: string,
    @Param('repoName') repoName: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(50), ParseIntPipe) sizeRaw: number,
    @Auth() issuer: Issuer,
  ) {
    return this.issueBranches.listRepositoryBranches({
      workspaceId,
      userId: issuer.id,
      owner,
      repoName,
      page,
      sizeRaw,
    });
  }
}
