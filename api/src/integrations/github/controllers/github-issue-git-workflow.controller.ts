import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { GithubCreateIssueBranchBodyDto } from '../dto/github-create-issue-branch-body.dto';
import { GithubCreateIssuePullBodyDto } from '../dto/github-create-issue-pull-body.dto';
import { GithubIssueGitWorkflowService } from '../services';

/**
 * Workspace-scoped orchestration endpoints for Epicstory-created Git branches + PRs
 * (`user-to-server` token; task **06**).
 */
@Controller('integrations/github/workspaces/:workspaceId/issues')
export class GithubIssueGitWorkflowController {
  constructor(private readonly gitWorkflow: GithubIssueGitWorkflowService) {}

  @Post(':issueId/branches')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async createBranch(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('issueId', ParseIntPipe) issueId: number,
    @Body() body: GithubCreateIssueBranchBodyDto,
    @Auth() issuer: Issuer,
  ) {
    return this.gitWorkflow.createIssueBranch({
      workspaceId,
      issueId,
      userId: issuer.id,
      owner: body.owner,
      repoName: body.name,
      branchNameRaw: body.branchName,
      baseBranchRaw: body.baseBranch,
    });
  }

  @Post(':issueId/pulls')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async createPullRequest(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('issueId', ParseIntPipe) issueId: number,
    @Body() body: GithubCreateIssuePullBodyDto,
    @Auth() issuer: Issuer,
  ) {
    return this.gitWorkflow.openIssuePullRequest({
      workspaceId,
      issueId,
      issuer,
      owner: body.owner,
      repoName: body.name,
      headBranchName: body.headBranch,
      baseBranchRaw: body.baseBranch,
      title: body.title,
      bodyMarkdown: body.bodyMarkdown,
      draft: Boolean(body.draft),
    });
  }
}
