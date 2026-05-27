import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { extractIssueKeysFromText } from 'src/project/domain/issue-key';
import { IssueGithubPullRequest } from '../entities';
import { extractLegacyIssueIdFromBranchRef } from '../lib/issue-key-correlation';

type GenericPayload = Record<string, unknown>;

/**
 * Persists / updates issue ↔ GitHub PR rows from `pull_request` webhooks.
 * Correlation: issue key in PR `head_ref` (preferred) or legacy `{issueId}-` prefix.
 */
@Injectable()
export class GithubIssuePullRequestSyncService {
  private readonly logger = new Logger(GithubIssuePullRequestSyncService.name);

  constructor(
    @InjectRepository(IssueGithubPullRequest)
    private readonly prLinkRepo: Repository<IssueGithubPullRequest>,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
  ) {}

  async upsertFromPullPayloadForIssue(params: {
    issueId: number;
    owner: string;
    repoName: string;
    pullRequest: GenericPayload | null | undefined;
  }): Promise<void> {
    const pr = params.pullRequest;
    if (!pr) return;

    const ghPrId = githubIdString(pr);
    if (ghPrId == null) return;

    const htmlUrl = typeof pr.html_url === 'string' ? pr.html_url : null;
    if (!htmlUrl) return;

    const prNumber =
      typeof pr.number === 'number' && Number.isFinite(pr.number)
        ? pr.number
        : null;
    if (prNumber == null) return;

    const state = typeof pr.state === 'string' ? pr.state : 'open';
    const draft = typeof pr.draft === 'boolean' ? pr.draft : false;
    const merged = typeof pr.merged === 'boolean' ? pr.merged : false;

    const head = asObject(pr.head as unknown);
    const base = asObject(pr.base as unknown);
    const headRef = typeof head?.ref === 'string' ? head.ref : null;
    const baseRef = typeof base?.ref === 'string' ? base.ref : null;

    const mergedAt = isoToDate(pr.merged_at);
    const closedAt = isoToDate(pr.closed_at);
    const ghUpdatedAt = isoToDate(pr.updated_at);

    const existing = await this.prLinkRepo.findOne({
      where: { githubPullRequestId: ghPrId },
    });

    await this.persistRow({
      issueId: params.issueId,
      owner: params.owner.trim(),
      repoName: params.repoName.trim(),
      ghPrId,
      htmlUrl,
      prNumber,
      state,
      draft,
      merged,
      headRef,
      baseRef,
      mergedAt,
      closedAt,
      ghUpdatedAt,
      existing,
    });
  }

  async syncFromPullRequestWebhookPayload(payload: unknown): Promise<void> {
    const root = asObject(payload);
    const pr = asObject(root?.pull_request);
    const repo = asObject(root?.repository);
    if (!pr || !repo) return;

    const ghPrId = githubIdString(pr);
    if (ghPrId == null) return;

    const htmlUrl = typeof pr.html_url === 'string' ? pr.html_url : null;
    if (!htmlUrl) return;

    const prNumber =
      typeof pr.number === 'number' && Number.isFinite(pr.number)
        ? pr.number
        : null;
    if (prNumber == null) return;

    const state = typeof pr.state === 'string' ? pr.state : 'open';
    const draft = typeof pr.draft === 'boolean' ? pr.draft : false;
    const merged = typeof pr.merged === 'boolean' ? pr.merged : false;

    const fullName =
      typeof repo.full_name === 'string' ? repo.full_name.trim() : null;
    if (!fullName) return;
    const slash = fullName.indexOf('/');
    if (slash < 1 || slash >= fullName.length - 1) return;
    const owner = fullName.slice(0, slash);
    const repoName = fullName.slice(slash + 1);

    const head = asObject(pr.head);
    const base = asObject(pr.base);
    const headRef = typeof head?.ref === 'string' ? head.ref : null;
    const baseRef = typeof base?.ref === 'string' ? base.ref : null;

    const mergedAt = isoToDate(pr.merged_at);
    const closedAt = isoToDate(pr.closed_at);
    const ghUpdatedAt = isoToDate(pr.updated_at);

    const existing = await this.prLinkRepo.findOne({
      where: { githubPullRequestId: ghPrId },
    });

    let issueId: number | undefined = existing?.issueId;
    if (issueId == null && headRef != null) {
      issueId = await this.resolveIssueIdFromBranchRef(
        headRef,
        owner,
        repoName,
      );
    }

    if (issueId == null) {
      if (existing) {
        issueId = existing.issueId;
      } else {
        this.logger.debug(
          `pull_request github id=${ghPrId}: no Epicstory issue correlation (head_ref=${headRef ?? '?'})`,
        );
        return;
      }
    }

    await this.persistRow({
      issueId,
      owner,
      repoName,
      ghPrId,
      htmlUrl,
      prNumber,
      state,
      draft,
      merged,
      headRef,
      baseRef,
      mergedAt,
      closedAt,
      ghUpdatedAt,
      existing,
    });
  }

  private async persistRow(params: {
    issueId: number;
    owner: string;
    repoName: string;
    ghPrId: string;
    htmlUrl: string;
    prNumber: number;
    state: string;
    draft: boolean;
    merged: boolean;
    headRef: string | null;
    baseRef: string | null;
    mergedAt: Date | null;
    closedAt: Date | null;
    ghUpdatedAt: Date | null;
    existing: IssueGithubPullRequest | null;
  }): Promise<void> {
    const rowData: Partial<IssueGithubPullRequest> = {
      issueId: params.issueId,
      githubPullRequestId: params.ghPrId,
      owner: params.owner,
      repoName: params.repoName,
      prNumber: params.prNumber,
      htmlUrl: params.htmlUrl,
      headRef: params.headRef,
      baseRef: params.baseRef,
      state: params.state,
      draft: params.draft,
      merged: params.merged,
      mergedAt: params.mergedAt,
      closedAt: params.closedAt,
      githubUpdatedAt: params.ghUpdatedAt,
    };

    if (params.existing) {
      Object.assign(params.existing, rowData);
      await this.prLinkRepo.save(params.existing);
      return;
    }

    await this.prLinkRepo.save(this.prLinkRepo.create(rowData));
  }

  private async resolveIssueIdFromBranchRef(
    headRef: string,
    owner: string,
    repoName: string,
  ): Promise<number | undefined> {
    const keys = extractIssueKeysFromText(headRef);
    if (keys.length > 0) {
      const row = await this.issueRepo
        .createQueryBuilder('i')
        .select('i.id', 'id')
        .where('i.issue_key IN (:...keys)', { keys })
        .orderBy('i.id', 'ASC')
        .limit(1)
        .getRawOne<{ id: string }>();
      if (row?.id) {
        return Number(row.id);
      }
    }

    const legacyId = extractLegacyIssueIdFromBranchRef(headRef);
    if (legacyId != null) {
      const issue = await this.issueRepo.findOne({ where: { id: legacyId } });
      if (issue) return issue.id;
    }

    this.logger.debug(
      `pull_request head_ref=${headRef} (${owner}/${repoName}): no issue key match`,
    );
    return undefined;
  }
}

function asObject(v: unknown): GenericPayload | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as GenericPayload)
    : null;
}

function githubIdString(obj: GenericPayload | null): string | undefined {
  if (obj === null || !('id' in obj)) return undefined;
  const id = obj.id;
  if (typeof id === 'number') return String(id);
  if (typeof id === 'string') return id.trim();
  return undefined;
}

function isoToDate(v: unknown): Date | null {
  if (v == null) return null;
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
