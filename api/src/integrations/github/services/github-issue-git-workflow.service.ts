import type {
  IGithubCreateIssueBranchResponse,
  IGithubIntegrationApiErrorCode,
  IGithubIssuePullRequestLink,
} from '@epicstory/contracts';
import type { JSONContent } from '@tiptap/core';
import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Issuer } from 'src/core/auth';
import { AppConfig } from 'src/core/app.config';
import { IntegrationTokenCryptoService } from 'src/integrations/shared';
import { CreateIssueComment } from 'src/project/application/features/issue/create-issue-comment.command';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  GithubEpicstoryPrTimelineMarker,
  GithubUserConnection,
  IssueGithubPullRequest,
} from '../entities';
import { githubHttpConfigFromApp } from '../lib/github-http-client';
import {
  GithubUserRestHttpError,
  githubCreateGitRef,
  githubCreatePullRequest,
  githubGetRefHeadSha,
} from '../lib/github-user-api-rest';
import {
  GithubInstallationRepository,
  GithubUserConnectionRepository,
  ProjectGithubRepoRepository,
} from '../repositories';
import { GithubApiService } from './github-api.service';
import { mapIssueGithubPullRequestRow } from './github-issue-pull-request.mapper';
import { GithubIssuePullRequestSyncService } from './github-issue-pull-request-sync.service';
import { GithubIssueBranchService } from './github-issue-branch.service';
import { GithubUserOAuthService } from './github-user-oauth.service';

type GenericPayload = Record<string, unknown>;

@Injectable()
export class GithubIssueGitWorkflowService {
  constructor(
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    @InjectRepository(IssueGithubPullRequest)
    private readonly prLinkRepo: Repository<IssueGithubPullRequest>,
    @InjectRepository(GithubEpicstoryPrTimelineMarker)
    private readonly timelineMarkerRepo: Repository<GithubEpicstoryPrTimelineMarker>,
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly installations: GithubInstallationRepository,
    private readonly userGithub: GithubUserConnectionRepository,
    private readonly crypto: IntegrationTokenCryptoService,
    private readonly config: AppConfig,
    private readonly githubUserOAuth: GithubUserOAuthService,
    private readonly githubInstallationApi: GithubApiService,
    private readonly prSync: GithubIssuePullRequestSyncService,
    private readonly commandBus: CommandBus,
    private readonly projectGithubRepos: ProjectGithubRepoRepository,
    private readonly issueBranches: GithubIssueBranchService,
  ) {}

  async createIssueBranch(params: {
    workspaceId: number;
    issueId: number;
    userId: number;
    owner: string;
    repoName: string;
    branchNameRaw?: string;
    baseBranchRaw?: string | null;
  }): Promise<IGithubCreateIssueBranchResponse> {
    const repoFullOuter = `${params.owner}/${params.repoName}`;
    const runBranch = async (): Promise<IGithubCreateIssueBranchResponse> => {
      const ctx = await this.loadWorkflowContext(params);
      const baseTrim = params.baseBranchRaw?.trim();
      const baseBranchResolved =
        baseTrim && baseTrim.length > 0 ? baseTrim : ctx.baseBranch;
      const branchNameResolved =
        params.branchNameRaw?.trim() ??
        `${ctx.issue.id}-${slugFromIssueTitle(ctx.issue.title)}`;

      const trimmedBranch = sanitizeBranchLeaf(branchNameResolved);
      if (!trimmedBranch) {
        throw new BadRequestException(
          'branchName resolves empty after sanitizing',
        );
      }

      const httpConfig = githubHttpConfigFromApp(this.config);
      try {
        const tipSha = await githubGetRefHeadSha({
          token: ctx.accessToken,
          owner: ctx.owner,
          repo: ctx.repoName,
          headBranchName: baseBranchResolved,
          httpConfig,
        });
        try {
          const created = await githubCreateGitRef({
            token: ctx.accessToken,
            owner: ctx.owner,
            repo: ctx.repoName,
            branchNameOnly: trimmedBranch,
            sha: tipSha,
            httpConfig,
          });
          return {
            branchName: trimmedBranch,
            gitRef: created.ref,
            tipSha: created.objectSha,
          };
        } catch (branchErr: unknown) {
          if (
            branchErr instanceof GithubUserRestHttpError &&
            branchErr.statusCode === 401
          ) {
            throw branchErr;
          }
          normalizeGithubUserRestWorkflowFailure(branchErr, {
            duplicateBranchConflict: trimmedBranch,
            repoFullName: `${ctx.owner}/${ctx.repoName}`,
          });
        }
      } catch (baseErr: unknown) {
        if (
          baseErr instanceof GithubUserRestHttpError &&
          baseErr.statusCode === 401
        ) {
          throw baseErr;
        }
        normalizeGithubUserRestWorkflowFailure(baseErr, {
          repoFullName: `${ctx.owner}/${ctx.repoName}`,
        });
      }
    };

    try {
      const created = await this.withGithubUser401RefreshRetry(
        params.workspaceId,
        params.userId,
        runBranch,
      );
      await this.issueBranches.persistIssueBranchSelection({
        issueId: params.issueId,
        workspaceId: params.workspaceId,
        userId: params.userId,
        selection: {
          branchName: created.branchName,
          owner: params.owner.trim(),
          repoName: params.repoName.trim(),
        },
        verifyExistsOnGithub: false,
      });
      return created;
    } catch (e: unknown) {
      normalizeGithubUserRestWorkflowFailure(e, {
        repoFullName: repoFullOuter,
      });
    }
  }

  async openIssuePullRequest(params: {
    workspaceId: number;
    issueId: number;
    issuer: Issuer;
    owner: string;
    repoName: string;
    headBranchName: string;
    baseBranchRaw?: string | null;
    title: string;
    bodyMarkdown?: string;
    draft: boolean;
  }): Promise<IGithubIssuePullRequestLink> {
    const headLeaf = sanitizeBranchLeaf(params.headBranchName);
    if (!headLeaf) throw new BadRequestException('Invalid headBranch');

    const repoFullOuter = `${params.owner}/${params.repoName}`;

    const runPullRequest = async (): Promise<unknown> => {
      const ctx = await this.loadWorkflowContext({
        workspaceId: params.workspaceId,
        issueId: params.issueId,
        userId: params.issuer.id,
        owner: params.owner,
        repoName: params.repoName,
      });

      const baseTrim = params.baseBranchRaw?.trim();
      const baseBranchResolved =
        baseTrim && baseTrim.length > 0 ? baseTrim : ctx.baseBranch;

      const httpConfig = githubHttpConfigFromApp(this.config);
      try {
        return await githubCreatePullRequest({
          token: ctx.accessToken,
          owner: ctx.owner,
          repo: ctx.repoName,
          headBranchName: headLeaf,
          baseBranchName: baseBranchResolved,
          title: params.title.trim(),
          bodyMarkdown: params.bodyMarkdown?.trim() ?? '',
          draft: params.draft,
          httpConfig,
        });
      } catch (e: unknown) {
        if (e instanceof GithubUserRestHttpError && e.statusCode === 401) {
          throw e;
        }
        normalizeGithubUserRestWorkflowFailure(e, {
          repoFullName: `${ctx.owner}/${ctx.repoName}`,
        });
      }
    };

    let rawPr: unknown;
    try {
      rawPr = await this.withGithubUser401RefreshRetry(
        params.workspaceId,
        params.issuer.id,
        runPullRequest,
      );
    } catch (e: unknown) {
      normalizeGithubUserRestWorkflowFailure(e, {
        repoFullName: repoFullOuter,
      });
    }

    await this.prSync.upsertFromPullPayloadForIssue({
      issueId: params.issueId,
      owner: params.owner.trim(),
      repoName: params.repoName.trim(),
      pullRequest: asObject(rawPr),
    });

    const ghPrNumeric = ghPrNumericId(rawPr);
    if (ghPrNumeric == null) {
      throw new InternalServerErrorException(
        'GitHub opened a PR without a usable id payload',
      );
    }
    const ghPrIdStr = String(ghPrNumeric);

    const persisted = await this.prLinkRepo.findOne({
      where: { githubPullRequestId: ghPrIdStr },
    });
    if (!persisted) {
      throw new InternalServerErrorException(
        'Failed to load persisted PR link after GitHub PR create',
      );
    }

    await this.maybePostTimelineAnnouncement({
      issuer: params.issuer,
      issueId: params.issueId,
      githubPullRequestId: ghPrIdStr,
      fullName: `${params.owner.trim()}/${params.repoName.trim()}`,
      prNumber: persisted.prNumber,
      htmlUrl: persisted.htmlUrl,
      draft: params.draft,
      headBranch: headLeaf,
    });

    return mapIssueGithubPullRequestRow(persisted);
  }

  private async loadWorkflowContext(params: {
    workspaceId: number;
    issueId: number;
    userId: number;
    owner: string;
    repoName: string;
  }) {
    if (!params.workspaceId || !params.issueId) {
      throw new BadRequestException('workspaceId and issueId are required');
    }

    const issue = await this.issueRepo.findOne({
      where: { id: params.issueId },
    });
    if (!issue || issue.workspaceId !== params.workspaceId) {
      throw new ForbiddenException('Issue not found');
    }

    await this.workspaceRepo.requiresMembership(
      params.workspaceId,
      params.userId,
    );

    const installation = await this.installations.findByWorkspaceId(
      params.workspaceId,
    );
    if (!installation) {
      throw githubIntegrationMemberUnprocessable(
        'This workspace does not have the GitHub App installed yet. Ask a workspace admin to install it under Integrations → GitHub.',
        'GITHUB_WORKSPACE_INSTALL_REQUIRED',
      );
    }

    let userConn = await this.userGithub.findActiveForWorkspaceUser(
      params.workspaceId,
      params.userId,
    );
    if (!userConn?.accessTokenEncrypted) {
      throw githubIntegrationMemberUnprocessable(
        'Your Epicstory account is not linked to GitHub for this workspace. Open Integrations → GitHub and complete “Link your GitHub account”, then try creating the branch or pull request again.',
        'GITHUB_MEMBER_OAUTH_REQUIRED',
      );
    }

    userConn = await this.refreshGithubUserTokensMaybe(userConn, 'skew');

    const expiresAt = userConn.tokenExpiresAt ?? null;
    if (expiresAt != null && expiresAt <= new Date()) {
      throw githubIntegrationMemberUnprocessable(
        'Your GitHub link for this workspace has expired. Open Integrations → GitHub and link your account again, then retry.',
        'GITHUB_MEMBER_TOKEN_EXPIRED',
      );
    }

    let accessToken: string;
    try {
      accessToken = this.crypto.decrypt(userConn.accessTokenEncrypted);
    } catch {
      throw githubIntegrationMemberUnprocessable(
        'Your stored GitHub link is invalid. Open Integrations → GitHub, unlink if shown, then link your account again before retrying.',
        'GITHUB_MEMBER_TOKEN_DECRYPT_FAILED',
      );
    }

    const link = await this.projectGithubRepos.findOne({
      where: {
        projectId: issue.projectId,
        owner: params.owner.trim(),
        name: params.repoName.trim(),
      },
    });
    if (!link) {
      throw new BadRequestException(
        'Repository is not linked to this Epicstory project',
      );
    }

    const baseBranch = link.defaultBranch?.trim()?.length
      ? link.defaultBranch!.trim()
      : null;

    let resolvedDefault = baseBranch;
    if (!resolvedDefault) {
      const details = await this.githubInstallationApi.fetchRepositoryDetails(
        installation.githubInstallationId,
        params.owner.trim(),
        params.repoName.trim(),
        params.workspaceId,
      );
      if (!details?.defaultBranch) {
        throw new BadRequestException(
          'Repo default_branch is unknown — set it on the project link or GitHub repo',
        );
      }
      resolvedDefault = details.defaultBranch;
    }

    return {
      issue,
      accessToken,
      owner: params.owner.trim(),
      repoName: params.repoName.trim(),
      baseBranch: resolvedDefault,
    };
  }

  /**
   * Proactively refresh user-to-server access token (skew window, or forced after GitHub HTTP 401).
   */
  private async refreshGithubUserTokensMaybe(
    userConn: GithubUserConnection,
    mode: 'skew' | 'force',
  ): Promise<GithubUserConnection> {
    if (!this.config.GITHUB_USER_SERVER_REFRESH_TOKEN_ENABLED) {
      return userConn;
    }
    const refreshEnc = userConn.refreshTokenEncrypted?.trim();
    if (!refreshEnc) {
      return userConn;
    }

    const skewMs =
      Math.max(0, this.config.GITHUB_USER_TOKEN_REFRESH_SKEW_SEC) * 1000;
    const expMs = userConn.tokenExpiresAt?.getTime();
    const shouldRefresh =
      mode === 'force' || expMs == null || Date.now() >= expMs - skewMs;

    if (!shouldRefresh) {
      return userConn;
    }

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
      if (!accessToken) {
        return userConn;
      }

      const accessTokenEncrypted = this.crypto.encrypt(accessToken);
      const rotatedRefresh = token.refresh_token?.trim();
      const nextRefreshEncrypted =
        rotatedRefresh && rotatedRefresh.length > 0
          ? this.crypto.encrypt(rotatedRefresh)
          : refreshEnc;
      const tokenExpiresAt =
        token.expires_in != null && token.expires_in > 0
          ? new Date(Date.now() + token.expires_in * 1000)
          : null;

      Object.assign(userConn, {
        accessTokenEncrypted,
        refreshTokenEncrypted: nextRefreshEncrypted,
        tokenExpiresAt,
      });
      await this.userGithub.save(userConn);
      return userConn;
    } catch {
      return userConn;
    }
  }

  private async tryForceRefreshGithubUserAccessToken(
    workspaceId: number,
    userId: number,
  ): Promise<boolean> {
    const row = await this.userGithub.findActiveForWorkspaceUser(
      workspaceId,
      userId,
    );
    if (!row) return false;
    const prevTok = row.accessTokenEncrypted ?? '';
    const nextRow = await this.refreshGithubUserTokensMaybe(row, 'force');
    return (nextRow.accessTokenEncrypted ?? '') !== prevTok;
  }

  /**
   * Runs a GitHub user-token call; if GitHub returns HTTP 401 once, force-refresh the user token
   * (when refresh_token flow is enabled) then retry the runner once.
   */
  private async withGithubUser401RefreshRetry<T>(
    workspaceId: number,
    userId: number,
    runner: () => Promise<T>,
  ): Promise<T> {
    try {
      return await runner();
    } catch (e: unknown) {
      if (!(e instanceof GithubUserRestHttpError && e.statusCode === 401)) {
        throw e;
      }
      const rotated = await this.tryForceRefreshGithubUserAccessToken(
        workspaceId,
        userId,
      );
      if (!rotated) throw e;
      return await runner();
    }
  }

  private async maybePostTimelineAnnouncement(params: {
    issuer: Issuer;
    issueId: number;
    githubPullRequestId: string;
    fullName: string;
    prNumber: number;
    htmlUrl: string;
    draft: boolean;
    headBranch: string;
  }) {
    const claimedNew = await this.tryClaimTimelineAnnouncement({
      issueId: params.issueId,
      githubPullRequestId: params.githubPullRequestId,
    });

    if (!claimedNew) {
      return;
    }

    try {
      await this.commandBus.execute(
        new CreateIssueComment({
          issuer: params.issuer,
          issueId: params.issueId,
          content: buildGithubPrAnnouncementDoc(params),
        }),
      );
    } catch (e) {
      await this.timelineMarkerRepo.delete({
        issueId: params.issueId,
        githubPullRequestId: params.githubPullRequestId,
      });
      throw e;
    }
  }

  private async tryClaimTimelineAnnouncement(params: {
    issueId: number;
    githubPullRequestId: string;
  }): Promise<boolean> {
    try {
      await this.timelineMarkerRepo.insert({
        issueId: params.issueId,
        githubPullRequestId: params.githubPullRequestId,
      });
      return true;
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string } | undefined)?.code === '23505'
      ) {
        return false;
      }
      throw e;
    }
  }
}

function buildGithubPrAnnouncementDoc(params: {
  fullName: string;
  prNumber: number;
  htmlUrl: string;
  draft: boolean;
  headBranch: string;
}): JSONContent {
  const label = `${params.fullName}#${params.prNumber}`;
  const draftSeg = params.draft ? ' (draft)' : '';
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: `Opened pull request${draftSeg}: ` },
          {
            type: 'text',
            marks: [{ type: 'link', attrs: { href: params.htmlUrl } }],
            text: label,
          },
          { type: 'text', text: ' from branch ' },
          { type: 'text', text: params.headBranch },
          { type: 'text', text: '.' },
        ],
      },
    ],
  };
}

function slugFromIssueTitle(title: string): string {
  const t = title
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const base = (t || 'branch').slice(0, 48);
  return base;
}

/** GitHub refs/heads leaf; keeps simple ASCII branch names Epicstory emits. */
function sanitizeBranchLeaf(name: string): string {
  return name.trim().replace(/\s+/g, '-').slice(0, 244).replace(/^\/+/, '');
}

function asObject(v: unknown): GenericPayload | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as GenericPayload)
    : null;
}

function ghPrNumericId(payload: unknown): number | null {
  const obj = payload as GenericPayload | null | undefined;
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const idRaw = obj.id as unknown;
  if (typeof idRaw === 'number' && Number.isFinite(idRaw)) return idRaw;
  if (typeof idRaw === 'string' && Number.isFinite(Number(idRaw))) {
    return Number(idRaw);
  }
  return null;
}

function githubIntegrationMemberUnprocessable(
  message: string,
  code: IGithubIntegrationApiErrorCode,
): UnprocessableEntityException {
  return new UnprocessableEntityException({ message, githubErrorCode: code });
}

/**
 * Turns {@link GithubUserRestHttpError} into Nest exceptions with GitHub-derived messages;
 * duplicate branch create → 409; auth/ACL → 422; plausible server errors → 502.
 */
function normalizeGithubUserRestWorkflowFailure(
  err: unknown,
  opts?: { duplicateBranchConflict?: string; repoFullName?: string },
): never {
  if (!(err instanceof GithubUserRestHttpError)) {
    throw err;
  }
  const e = err;
  const repoLabel = opts?.repoFullName ?? 'this repository';

  if (e.statusCode === 401) {
    throw githubIntegrationMemberUnprocessable(
      `${e.summary} Open Integrations → GitHub and link your GitHub account again, then retry.`,
      'GITHUB_MEMBER_REAUTHORIZE_REQUIRED',
    );
  }

  if (e.statusCode === 403) {
    throw githubIntegrationMemberUnprocessable(
      `${e.summary} Check repo permissions on ${repoLabel}; if your GitHub link is stale, reconnect from workspace Integrations.`,
      'GITHUB_MEMBER_REPO_PERMISSION_DENIED',
    );
  }

  if (e.statusCode === 404) {
    throw new BadRequestException(e.summary);
  }

  if (
    e.statusCode === 422 &&
    opts?.duplicateBranchConflict != null &&
    opts.repoFullName != null
  ) {
    const haystack = `${e.summary}\n${e.rawBodySnippet}`.toLowerCase();
    if (
      haystack.includes('reference already exists') ||
      haystack.includes('already exists')
    ) {
      throw new ConflictException(
        `Branch "${opts.duplicateBranchConflict}" already exists on ${opts.repoFullName}`,
      );
    }
  }

  if (e.statusCode === 422) {
    throw new BadRequestException(e.summary);
  }

  if (e.statusCode >= 500) {
    throw new BadGatewayException(e.summary);
  }

  throw new BadRequestException(e.summary);
}
