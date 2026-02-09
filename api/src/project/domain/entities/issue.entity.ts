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
import { Project } from './project.entity';

@Entity({ schema: PROJECT_SCHEMA })
export class Issue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  description: string;

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

  @Column({ nullable: true })
  parentIssueId?: number;

  @ManyToOne(() => Issue, { nullable: true, onDelete: 'CASCADE' })
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
    });
  }
}
