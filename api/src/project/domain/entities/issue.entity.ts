import type { JSONContent } from '@tiptap/core';
import { User } from 'src/auth';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Workspace } from 'src/workspace/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { IIssueGithubBranchStored } from '@epicstory/contracts';
import { Project } from './project.entity';
import { Label } from './label.entity';

@Entity({ schema: PROJECT_SCHEMA })
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  /** Monotonic per project; combined with project prefix for `issueKey`. */
  @Column({ name: 'issue_number' })
  issueNumber: number;

  /** Stable external id, e.g. `EPIC-42` (unique per workspace). */
  @Column({ name: 'issue_key', length: 20 })
  issueKey: string;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'jsonb' })
  description: JSONContent;

  @Column()
  workspaceId: number;
  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  projectId: number;
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @Column()
  createdById: number;

  @ManyToOne(() => User)
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 'todo' })
  status: string;

  @Column({ name: 'issue_type', default: 'task' })
  issueType: 'task' | 'epic';

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ type: 'uuid', nullable: true })
  scheduledEventId?: string;

  @Column({ default: 0 })
  priority: number;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'issue_assignee',
    joinColumn: { name: 'issue_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  assignees: User[];

  @ManyToMany(() => Label)
  @JoinTable({
    name: 'issue_label',
    joinColumn: { name: 'issue_id' },
    inverseJoinColumn: { name: 'label_id' },
  })
  labels: Label[];

  @Column({ nullable: true })
  parentIssueId?: number;

  @Column({ nullable: true })
  commentChannelId?: number | null;

  /** Selected GitHub branch for issue workflows (`owner`, `repoName`, `branchName`). */
  @Column({ name: 'github_branch', type: 'jsonb', nullable: true })
  githubBranch: IIssueGithubBranchStored | null;

  @ManyToOne(() => Issue, { nullable: true, onDelete: 'SET NULL' })
  parentIssue: Issue;

  @OneToMany(() => Issue, (issue) => issue.parentIssue)
  subIssues: Issue[];

  constructor(data: Partial<Issue> = {}) {
    patch(this, data);
  }

  static create(data: Partial<Issue> = {}) {
    return new Issue({
      ...data,
      assignees: data.assignees ?? [],
      labels: data.labels ?? [],
    });
  }
}
