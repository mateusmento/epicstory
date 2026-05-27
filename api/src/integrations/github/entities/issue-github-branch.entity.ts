import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type IssueGithubBranchLinkSource =
  | 'webhook_push'
  | 'epicstory_create'
  | 'manual';

@Entity({ schema: 'integration', name: 'issue_github_branches' })
export class IssueGithubBranch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'issue_id' })
  issueId: number;

  @Column({ name: 'workspace_id' })
  workspaceId: number;

  @Column()
  owner: string;

  @Column({ name: 'repo_name' })
  repoName: string;

  @Column({ name: 'branch_name' })
  branchName: string;

  @Column({ default: 'webhook_push' })
  source: IssueGithubBranchLinkSource;

  @CreateDateColumn({ name: 'first_linked_at', type: 'timestamptz' })
  firstLinkedAt: Date;

  @UpdateDateColumn({ name: 'last_pushed_at', type: 'timestamptz' })
  lastPushedAt: Date;
}
