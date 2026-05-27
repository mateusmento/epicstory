import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { extractIssueKeysFromText } from 'src/project/domain/issue-key';
import {
  IssueGithubBranch,
  type IssueGithubBranchLinkSource,
} from '../entities/issue-github-branch.entity';
import { collectIssueKeysFromPushPayload } from '../lib/issue-key-correlation';
import { GithubInstallationRepository } from '../repositories';

type GenericPayload = Record<string, unknown>;

@Injectable()
export class GithubIssueBranchLinkService {
  private readonly logger = new Logger(GithubIssueBranchLinkService.name);

  constructor(
    private readonly installationRepo: GithubInstallationRepository,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
    @InjectRepository(IssueGithubBranch)
    private readonly branchLinkRepo: Repository<IssueGithubBranch>,
  ) {}

  async linkBranchForIssue(params: {
    issueId: number;
    workspaceId: number;
    owner: string;
    repoName: string;
    branchName: string;
    source: IssueGithubBranchLinkSource;
  }): Promise<void> {
    const owner = params.owner.trim();
    const repoName = params.repoName.trim();
    const branchName = params.branchName.trim();
    if (!owner || !repoName || !branchName) return;

    const existing = await this.branchLinkRepo.findOne({
      where: {
        issueId: params.issueId,
        owner,
        repoName,
        branchName,
      },
    });

    if (existing) {
      existing.lastPushedAt = new Date();
      if (
        existing.source === 'webhook_push' &&
        params.source !== 'webhook_push'
      ) {
        existing.source = params.source;
      }
      await this.branchLinkRepo.save(existing);
      return;
    }

    await this.branchLinkRepo.save(
      this.branchLinkRepo.create({
        issueId: params.issueId,
        workspaceId: params.workspaceId,
        owner,
        repoName,
        branchName,
        source: params.source,
      }),
    );
  }

  async syncFromPushWebhookPayload(payload: unknown): Promise<void> {
    const root = asObject(payload);
    const repo = asObject(root?.repository);
    const installation = asObject(root?.installation);
    if (!repo || !installation) return;

    const ghInstallationId = installationIdString(installation);
    if (ghInstallationId == null) return;

    const epicInstallation =
      await this.installationRepo.findByGithubInstallationId(ghInstallationId);
    if (!epicInstallation) {
      this.logger.debug(
        `push webhook: no workspace for GitHub installation ${ghInstallationId}`,
      );
      return;
    }

    const workspaceId = epicInstallation.workspaceId;
    const fullName =
      typeof repo.full_name === 'string' ? repo.full_name.trim() : null;
    if (!fullName) return;
    const slash = fullName.indexOf('/');
    if (slash < 1 || slash >= fullName.length - 1) return;
    const owner = fullName.slice(0, slash);
    const repoName = fullName.slice(slash + 1);

    const ref = typeof root?.ref === 'string' ? root.ref : null;
    const commits = Array.isArray(root?.commits) ? root.commits : [];
    const commitMessages = commits
      .map((c) => asObject(c))
      .filter((c): c is GenericPayload => c != null)
      .map((c) => (typeof c.message === 'string' ? c.message : ''))
      .filter((m) => m.length > 0);

    // Helpful observability: log when we detect Jira-style issue keys in commit messages,
    // since this is a common expectation when using push webhooks.
    const issueKeysFromCommits = [
      ...new Set(
        commitMessages.flatMap((m) => extractIssueKeysFromText(m.trim())),
      ),
    ];

    const issueKeys = collectIssueKeysFromPushPayload({
      ref,
      commitMessages,
    });
    if (issueKeys.length === 0) return;

    const issues = await this.issueRepo.find({
      where: { workspaceId, issueKey: In(issueKeys) },
      select: { id: true, issueKey: true },
    });
    if (issues.length === 0) {
      this.logger.debug(
        `push ${fullName} ref=${ref ?? '?'}: no matching issue keys (${issueKeys.join(', ')})`,
      );
      return;
    }

    const branchName = branchNameFromRef(ref);
    if (!branchName) return;

    const pushedAt = pushedAtFromPayload(root) ?? new Date();

    if (issueKeysFromCommits.length > 0) {
      this.logger.log(
        `push ${fullName}#${branchName}: issue keys found in commit messages (${issueKeysFromCommits.join(', ')})`,
      );
    }

    for (const issue of issues) {
      const existing = await this.branchLinkRepo.findOne({
        where: {
          issueId: issue.id,
          owner,
          repoName,
          branchName,
        },
      });

      if (existing) {
        existing.lastPushedAt = pushedAt;
        await this.branchLinkRepo.save(existing);
        continue;
      }

      await this.branchLinkRepo.save(
        this.branchLinkRepo.create({
          issueId: issue.id,
          workspaceId,
          owner,
          repoName,
          branchName,
          source: 'webhook_push',
          firstLinkedAt: pushedAt,
          lastPushedAt: pushedAt,
        }),
      );
    }

    this.logger.log(
      `push ${fullName}#${branchName}: linked ${issues.length} issue(s) (${issueKeys.join(', ')})`,
    );
  }
}

function branchNameFromRef(ref: string | null): string | null {
  if (!ref) return null;
  const trimmed = ref.trim();
  const prefix = 'refs/heads/';
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length) : trimmed;
}

function pushedAtFromPayload(root: GenericPayload): Date | null {
  const headCommit = asObject(root.head_commit);
  const ts =
    (headCommit && typeof headCommit.timestamp === 'string'
      ? headCommit.timestamp
      : null) ?? (typeof root.after === 'string' ? root.after : null);
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

function asObject(v: unknown): GenericPayload | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as GenericPayload)
    : null;
}

function installationIdString(inst: GenericPayload): string | undefined {
  const id = inst.id;
  if (typeof id === 'number') return String(id);
  if (typeof id === 'string') return id.trim();
  return undefined;
}
