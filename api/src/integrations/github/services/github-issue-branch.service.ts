import type {
  IIssueGithubBranch,
  IIssueGithubBranchStored,
} from '@epicstory/contracts';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { IssueGithubBranch } from '../entities/issue-github-branch.entity';
import { githubHttpConfigFromApp } from '../lib/github-http-client';
import { githubRepoBranchExists } from '../lib/github-user-api-rest';
import { GithubUserConnectionRepository } from '../repositories';
import { GithubUserOAuthService } from './github-user-oauth.service';
import { GithubWorkspaceRepoAccessService } from './github-workspace-repo-access.service';

function branchTreeUrl(
  owner: string,
  repoName: string,
  branchName: string,
): string {
  return `https://github.com/${owner}/${repoName}/tree/${encodeURIComponent(branchName)}`;
}

function normalizeStored(
  raw: IIssueGithubBranchStored | null | undefined,
): IIssueGithubBranchStored | null {
  if (!raw || typeof raw !== 'object') return null;
  const branchName = raw.branchName?.trim();
  const owner = raw.owner?.trim();
  const repoName = raw.repoName?.trim();
  if (!branchName || !owner || !repoName) return null;
  return { branchName, owner, repoName };
}

@Injectable()
export class GithubIssueBranchService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    @InjectRepository(IssueGithubBranch)
    private readonly issueBranchLinks: Repository<IssueGithubBranch>,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly workspaceRepoAccess: GithubWorkspaceRepoAccessService,
    private readonly userGithub: GithubUserConnectionRepository,
    private readonly crypto: IntegrationTokenCryptoService,
    private readonly config: AppConfig,
    private readonly githubUserOAuth: GithubUserOAuthService,
  ) {}

  async assertWorkspaceInstallationRepo(
    workspaceId: number,
    owner: string,
    repoName: string,
  ): Promise<void> {
    await this.workspaceRepoAccess.assertRepositoryAccessible(
      workspaceId,
      owner,
      repoName,
    );
  }

  async resolveMemberAccessToken(
    workspaceId: number,
    userId: number,
  ): Promise<string> {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, userId);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    let userConn = await this.userGithub.findActiveForWorkspaceUser(
      workspaceId,
      userId,
    );
    if (!userConn?.accessTokenEncrypted) {
      throw new ForbiddenException(
        'Link your GitHub account for this workspace before using branches.',
      );
    }

    userConn = await this.refreshGithubUserTokensMaybe(userConn);

    try {
      return this.crypto.decrypt(userConn.accessTokenEncrypted);
    } catch {
      throw new ForbiddenException(
        'Your stored GitHub link is invalid. Re-link from Integrations → GitHub.',
      );
    }
  }

  async enrichStoredBranch(
    workspaceId: number,
    userId: number | undefined,
    stored: IIssueGithubBranchStored | null | undefined,
  ): Promise<IIssueGithubBranch | null> {
    const norm = normalizeStored(stored);
    if (!norm) return null;

    const fullName = `${norm.owner}/${norm.repoName}`;
    const htmlUrl = branchTreeUrl(norm.owner, norm.repoName, norm.branchName);

    if (userId == null) {
      return { ...norm, fullName, htmlUrl, existsOnGithub: false };
    }

    let existsOnGithub = false;
    try {
      const token = await this.resolveMemberAccessToken(workspaceId, userId);
      const httpConfig = githubHttpConfigFromApp(this.config);
      existsOnGithub = await githubRepoBranchExists({
        token,
        owner: norm.owner,
        repo: norm.repoName,
        branchName: norm.branchName,
        httpConfig,
      });
    } catch {
      existsOnGithub = false;
    }

    return { ...norm, fullName, htmlUrl, existsOnGithub };
  }

  async validateBranchSelectionForIssue(params: {
    issue: Issue;
    selection: IIssueGithubBranchStored;
    userId: number;
    verifyExistsOnGithub?: boolean;
  }): Promise<IIssueGithubBranchStored> {
    const norm = normalizeStored(params.selection);
    if (!norm) {
      throw new BadRequestException('Invalid githubBranch payload');
    }

    await this.assertWorkspaceInstallationRepo(
      params.issue.workspaceId,
      norm.owner,
      norm.repoName,
    );

    if (params.verifyExistsOnGithub) {
      const token = await this.resolveMemberAccessToken(
        params.issue.workspaceId,
        params.userId,
      );
      const httpConfig = githubHttpConfigFromApp(this.config);
      const exists = await githubRepoBranchExists({
        token,
        owner: norm.owner,
        repo: norm.repoName,
        branchName: norm.branchName,
        httpConfig,
      });
      if (!exists) {
        throw new BadRequestException(
          `Branch "${norm.branchName}" was not found on ${norm.owner}/${norm.repoName}`,
        );
      }
    }

    return norm;
  }

  async persistIssueBranchSelection(params: {
    issueId: number;
    workspaceId: number;
    userId: number;
    selection: IIssueGithubBranchStored;
    verifyExistsOnGithub?: boolean;
  }): Promise<Issue> {
    const issue = await this.issueRepo.findOne({
      where: { id: params.issueId },
    });
    if (!issue || issue.workspaceId !== params.workspaceId) {
      throw new ForbiddenException('Issue not found');
    }

    const norm = await this.validateBranchSelectionForIssue({
      issue,
      selection: params.selection,
      userId: params.userId,
      verifyExistsOnGithub: params.verifyExistsOnGithub ?? false,
    });

    issue.githubBranch = norm;
    return this.issueRepo.save(issue);
  }

  async clearIssueBranch(issueId: number): Promise<void> {
    await this.issueRepo.update({ id: issueId }, { githubBranch: null });
  }

  async enrichIssueForResponse(issue: Issue, userId?: number): Promise<Issue> {
    // If the legacy `issue.githubBranch` field isn't set, fall back to the most
    // recently pushed branch link discovered via push webhooks.
    const link =
      issue.githubBranch == null
        ? await this.issueBranchLinks.findOne({
            where: { issueId: issue.id, workspaceId: issue.workspaceId },
            order: { lastPushedAt: 'DESC' },
          })
        : null;

    const effectiveStored =
      issue.githubBranch ??
      (link
        ? {
            owner: link.owner,
            repoName: link.repoName,
            branchName: link.branchName,
          }
        : null);

    const enriched = await this.enrichStoredBranch(
      issue.workspaceId,
      userId,
      effectiveStored,
    );
    return Object.assign(issue, { githubBranch: enriched });
  }

  private async refreshGithubUserTokensMaybe(
    userConn: Awaited<
      ReturnType<GithubUserConnectionRepository['findActiveForWorkspaceUser']>
    >,
  ) {
    if (!userConn) return userConn;
    if (!this.config.GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED) {
      return userConn;
    }
    const refreshEnc = userConn.refreshTokenEncrypted?.trim();
    if (!refreshEnc) return userConn;

    const skewMs =
      Math.max(0, this.config.GITHUB_USER_TOKEN_REFRESH_SKEW_SEC) * 1000;
    const expMs = userConn.tokenExpiresAt?.getTime();
    const shouldRefresh = expMs == null || Date.now() >= expMs - skewMs;
    if (!shouldRefresh) return userConn;

    let refreshPlain: string;
    try {
      refreshPlain = this.crypto.decrypt(refreshEnc);
    } catch {
      return userConn;
    }

    try {
      const token =
        await this.githubUserOAuth.refreshUserAccessToken(refreshPlain);
      const accessToken = token.access_token?.trim();
      if (!accessToken) return userConn;

      userConn.accessTokenEncrypted = this.crypto.encrypt(accessToken);
      const rotatedRefresh = token.refresh_token?.trim();
      if (rotatedRefresh && rotatedRefresh.length > 0) {
        userConn.refreshTokenEncrypted = this.crypto.encrypt(rotatedRefresh);
      }
      userConn.tokenExpiresAt =
        token.expires_in != null && token.expires_in > 0
          ? new Date(Date.now() + token.expires_in * 1000)
          : null;
      await this.userGithub.save(userConn);
    } catch {
      return userConn;
    }

    return userConn;
  }
}
