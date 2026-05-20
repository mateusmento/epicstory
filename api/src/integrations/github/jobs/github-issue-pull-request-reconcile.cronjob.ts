import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { In, Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { Issue } from 'src/project/domain/entities/issue.entity';
import { IssueGithubPullRequest } from '../entities';
import { GithubInstallationRepository } from '../repositories';
import { GithubApiService } from '../services/github-api.service';
import { GithubIssuePullRequestSyncService } from '../services/github-issue-pull-request-sync.service';

@Injectable()
export class GithubIssuePullRequestReconcileCronjob {
  private readonly logger = new Logger(
    GithubIssuePullRequestReconcileCronjob.name,
  );

  constructor(
    private readonly config: AppConfig,
    private readonly githubApi: GithubApiService,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly prSync: GithubIssuePullRequestSyncService,
    @InjectRepository(IssueGithubPullRequest)
    private readonly prLinkRepo: Repository<IssueGithubPullRequest>,
    @InjectRepository(Issue)
    private readonly issueRepo: Repository<Issue>,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcileOpenPullRequestLinks(): Promise<void> {
    if (!this.config.GITHUB_PR_RECONCILE_ENABLED) {
      return;
    }
    if (!this.canMintInstallationTokens()) {
      return;
    }

    const batchSize = Math.max(
      1,
      Math.min(200, this.config.GITHUB_PR_RECONCILE_BATCH_SIZE),
    );

    const openRows = await this.prLinkRepo.find({
      where: { state: 'open' },
      order: { updatedAt: 'ASC' },
      take: batchSize,
    });

    if (openRows.length === 0) {
      return;
    }

    const issueIds = [...new Set(openRows.map((r) => r.issueId))];
    const issues = await this.issueRepo.find({
      where: { id: In(issueIds) },
      select: { id: true, workspaceId: true },
    });
    const workspaceByIssueId = new Map(
      issues.map((i) => [i.id, i.workspaceId]),
    );

    const byWorkspace = new Map<number, IssueGithubPullRequest[]>();
    for (const row of openRows) {
      const ws = workspaceByIssueId.get(row.issueId);
      if (ws == null) continue;
      const list = byWorkspace.get(ws) ?? [];
      list.push(row);
      byWorkspace.set(ws, list);
    }

    for (const [workspaceId, rows] of byWorkspace) {
      const installation =
        await this.installationRepo.findByWorkspaceId(workspaceId);
      if (!installation) {
        this.logger.debug(
          `PR reconcile: no GitHub installation for workspace ${workspaceId}; skip ${rows.length} row(s)`,
        );
        continue;
      }

      let token: string;
      try {
        token = await this.githubApi.createInstallationAccessToken(
          installation.githubInstallationId,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(
          `PR reconcile: could not mint installation token for workspace ${workspaceId}: ${msg}`,
        );
        continue;
      }

      for (const row of rows) {
        try {
          const pull =
            await this.githubApi.fetchPullRequestWithInstallationToken(
              token,
              row.owner,
              row.repoName,
              row.prNumber,
            );
          if (pull == null) {
            this.logger.debug(
              `PR reconcile: GitHub returned 404 for ${row.owner}/${row.repoName}#${row.prNumber}`,
            );
            continue;
          }

          await this.prSync.upsertFromPullPayloadForIssue({
            issueId: row.issueId,
            owner: row.owner,
            repoName: row.repoName,
            pullRequest: pull,
          });

          this.logger.debug(
            `PR reconcile: refreshed ${row.owner}/${row.repoName}#${row.prNumber} (issue ${row.issueId})`,
          );
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.warn(
            `PR reconcile: failed ${row.owner}/${row.repoName}#${row.prNumber}: ${msg}`,
          );
        }
      }
    }
  }

  private canMintInstallationTokens(): boolean {
    return Boolean(
      this.config.GITHUB_APP_ID?.trim() &&
        this.config.GITHUB_APP_PRIVATE_KEY?.trim(),
    );
  }
}
