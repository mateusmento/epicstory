import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/**
 * Rows record that Epicstory already posted an issue-thread comment for a given GitHub PR
 * (`upsert`-safe idempotency for task 06).
 */
@Entity({ schema: 'integration', name: 'github_epicstory_pr_timeline_markers' })
export class GithubEpicstoryPrTimelineMarker {
  @PrimaryColumn({ name: 'issue_id' })
  issueId: number;

  @PrimaryColumn({ name: 'github_pull_request_id', type: 'bigint' })
  githubPullRequestId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
