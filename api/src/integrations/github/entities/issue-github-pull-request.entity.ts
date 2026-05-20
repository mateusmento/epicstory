import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Links an Epicstory issue to a GitHub PR (many rows per issue×repo allowed; task 06).
 * Correlation for new rows: branch name prefix `{issueId}-` on the PR head ref.
 */
@Entity({ schema: 'integration', name: 'issue_github_pull_requests' })
export class IssueGithubPullRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'issue_id' })
  issueId: number;

  @Column({ name: 'github_pull_request_id', type: 'bigint', unique: true })
  githubPullRequestId: string;

  /** Repository owner login (canonical from GitHub). */
  @Column()
  owner: string;

  @Column({ name: 'repo_name' })
  repoName: string;

  @Column({ name: 'pr_number' })
  prNumber: number;

  @Column({ name: 'html_url', type: 'text' })
  htmlUrl: string;

  @Column({ name: 'head_ref', type: 'text', nullable: true })
  headRef?: string | null;

  @Column({ name: 'base_ref', type: 'text', nullable: true })
  baseRef?: string | null;

  /** GitHub enum: open | closed */
  @Column()
  state: string;

  @Column({ default: false })
  draft: boolean;

  @Column({ default: false })
  merged: boolean;

  @Column({ name: 'merged_at', type: 'timestamptz', nullable: true })
  mergedAt?: Date | null;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date | null;

  @Column({ name: 'github_updated_at', type: 'timestamptz', nullable: true })
  githubUpdatedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
