import { create } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Backlog } from './backlog.entity';
import { Workspace } from 'src/workspace/domain/entities';

@Entity({ schema: PROJECT_SCHEMA, name: 'workspace_project' })
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  /** Jira-style key prefix unique within the workspace (e.g. `EPIC`). */
  @Column({ name: 'issue_key_prefix', length: 10 })
  issueKeyPrefix: string;

  /** Next `issue_number` to assign on this project (1-based). */
  @Column({ name: 'next_issue_number', default: 1 })
  nextIssueNumber: number;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column({ nullable: true })
  teamId?: number;

  @Column({ nullable: true })
  backlogId: number;

  @ManyToOne(() => Backlog, { cascade: ['insert'] })
  backlog: Backlog;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  static create(data: { name: string; workspaceId: number; teamId?: number }) {
    return create(Project, data);
  }
}
