import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Workspace } from 'src/workspace/domain/entities';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Issue } from './issue.entity';
import { IssueDescriptionThreadMessage } from './issue-description-thread-message.entity';

export type DescriptionThreadKind = 'comment' | 'suggestion';
export type DescriptionThreadStatus =
  | 'open'
  | 'resolved'
  | 'accepted'
  | 'rejected';

@Entity({ schema: PROJECT_SCHEMA, name: 'issue_description_thread' })
export class IssueDescriptionThread {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  issueId: number;

  @ManyToOne(() => Issue, { onDelete: 'CASCADE' })
  issue: Issue;

  /** Stable TipTap mark attr; unique across threads. */
  @Column({ type: 'uuid' })
  markId: string;

  @Column({ type: 'varchar' })
  kind: DescriptionThreadKind;

  @Column({ type: 'varchar', default: 'open' })
  status: DescriptionThreadStatus;

  @Column({ type: 'text', nullable: true })
  quoteText: string | null;

  @Column({ type: 'text', nullable: true })
  proposedText: string | null;

  @Column()
  createdById: number;

  @Column({ type: 'int', nullable: true })
  resolvedById: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => IssueDescriptionThreadMessage, (m) => m.thread, {
    cascade: true,
  })
  messages: IssueDescriptionThreadMessage[];

  constructor(data: Partial<IssueDescriptionThread> = {}) {
    patch(this, data);
  }

  static create(data: Partial<IssueDescriptionThread> = {}) {
    return new IssueDescriptionThread(data);
  }
}
