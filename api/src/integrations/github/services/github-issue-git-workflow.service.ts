import type {
  IGithubCreateIssueBranchResponse,
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
import { CreateIssueComment } from 'src/project/application/features';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  GithubEpicstoryPrTimelineMarker,
  GithubUserConnection,
  IssueGithubPullRequest,
} from '../entities';
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

    try {
      const tipSha = await githubGetRefHeadSha({
        token: ctx.accessToken,
        owner: ctx.owner,
        repo: ctx.repoName,
        headBranchName: baseBranchResolved,
      });
      try {
        const created = await githubCreateGitRef({
          token: ctx.accessToken,
          owner: ctx.owner,
          repo: ctx.repoName,
          branchNameOnly: trimmedBranch,
          sha: tipSha,
        });
        return {
          branchName: trimmedBranch,
          gitRef: created.ref,
          tipSha: created.objectSha,
        };
      } catch (branchErr) {
        normalizeGithubUserRestWorkflowFailure(branchErr, {
          duplicateBranchConflict: trimmedBranch,
          repoFullName: `${ctx.owner}/${ctx.repoName}`,
        });
      }
    } catch (baseErr) {
      normalizeGithubUserRestWorkflowFailure(baseErr, {
        repoFullName: `${ctx.owner}/${ctx.repoName}`,
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

    const headLeaf = sanitizeBranchLeaf(params.headBranchName);
    if (!headLeaf) throw new BadRequestException('Invalid headBranch');

    let rawPr: unknown;
    try {
      rawPr = await githubCreatePullRequest({
        token: ctx.accessToken,
        owner: ctx.owner,
        repo: ctx.repoName,
        headBranchName: headLeaf,
        baseBranchName: baseBranchResolved,
        title: params.title.trim(),
        bodyMarkdown: params.bodyMarkdown?.trim() ?? '',
        draft: params.draft,
      });
    } catch (e) {
      normalizeGithubUserRestWorkflowFailure(e, {
        repoFullName: `${ctx.owner}/${ctx.repoName}`,
      });
    }

    await this.prSync.upsertFromPullPayloadForIssue({
      issueId: ctx.issue.id,
      owner: ctx.owner,
      repoName: ctx.repoName,
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
      issueId: ctx.issue.id,
      githubPullRequestId: ghPrIdStr,
      fullName: `${ctx.owner}/${ctx.repoName}`,
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
      throw new UnprocessableEntityException(
        'This workspace does not have a GitHub installation',
      );
    }

    let userConn = await this.userGithub.findActiveForWorkspaceUser(
      params.workspaceId,
      params.userId,
    );
    if (!userConn?.accessTokenEncrypted) {
      throw new UnprocessableEntityException(
        'Link your GitHub account in workspace Integrations → GitHub before creating branches or pull requests (member OAuth is separate from linking a repo to the project).',
      );
    }

    userConn = await this.refreshGithubUserTokensIfEligible(userConn);

    const expiresAt = userConn.tokenExpiresAt ?? null;
    if (expiresAt != null && expiresAt <= new Date()) {
      throw new UnprocessableEntityException(
        'GitHub authorization expired — reconnect GitHub.',
      );
    }

    let accessToken: string;
    try {
      accessToken = this.crypto.decrypt(userConn.accessTokenEncrypted);
    } catch {
      throw new UnprocessableEntityException(
        'Could not decrypt stored GitHub token — reconnect GitHub.',
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
   * Proactively refresh user-to-server access token when within {@link AppConfig.GITHUB_USER_TOKEN_REFRESH_SKEW_SEC}
   * of expiry (or past expiry), when a refresh_token is stored and the feature flag is on.
   */
  private async refreshGithubUserTokensIfEligible(
    userConn: GithubUserConnection,
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
    const shouldRefresh = expMs == null || Date.now() >= expMs - skewMs;

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

  if (e.statusCode === 401 || e.statusCode === 403) {
    throw new UnprocessableEntityException(
      `${e.summary} Check GitHub access to ${repoLabel} or reconnect GitHub from workspace settings.`,
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
