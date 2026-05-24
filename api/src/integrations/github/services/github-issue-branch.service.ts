import type {
  IIssueGithubBranch,
  IIssueGithubBranchStored,
  IGithubRepositoryBranchesPage,
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
import { githubHttpConfigFromApp } from '../lib/github-http-client';
import {
  githubListRepoBranches,
  githubRepoBranchExists,
} from '../lib/github-user-api-rest';
import {
  GithubUserConnectionRepository,
  ProjectGithubRepoRepository,
} from '../repositories';
import { GithubUserOAuthService } from './github-user-oauth.service';

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
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly projectGithubRepos: ProjectGithubRepoRepository,
    private readonly userGithub: GithubUserConnectionRepository,
    private readonly crypto: IntegrationTokenCryptoService,
    private readonly config: AppConfig,
    private readonly githubUserOAuth: GithubUserOAuthService,
  ) {}

  async assertProjectRepoLinked(
    projectId: number,
    owner: string,
    repoName: string,
  ): Promise<void> {
    const link = await this.projectGithubRepos.findOne({
      where: { projectId, owner: owner.trim(), name: repoName.trim() },
    });
    if (!link) {
      throw new BadRequestException(
        'Repository is not linked to this Epicstory project',
      );
    }
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

  async listRepositoryBranches(params: {
    workspaceId: number;
    userId: number;
    owner: string;
    repoName: string;
    page: number;
    sizeRaw: number;
  }): Promise<IGithubRepositoryBranchesPage> {
    const owner = params.owner.trim();
    const repoName = params.repoName.trim();
    const token = await this.resolveMemberAccessToken(
      params.workspaceId,
      params.userId,
    );
    const httpConfig = githubHttpConfigFromApp(this.config);
    const size = Math.min(100, Math.max(1, params.sizeRaw));
    const page = Math.max(1, params.page);
    const { branches, hasNextPage } = await githubListRepoBranches({
      token,
      owner,
      repo: repoName,
      page,
      perPage: size,
      httpConfig,
    });
    return { page, size, hasNextPage, branches };
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

    await this.assertProjectRepoLinked(
      params.issue.projectId,
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
    const enriched = await this.enrichStoredBranch(
      issue.workspaceId,
      userId,
      issue.githubBranch,
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
