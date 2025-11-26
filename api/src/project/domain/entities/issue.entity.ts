import { User } from 'src/auth';
import { patch } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

  @Column()
  projectId: number;

  @Column()
  createdById: number;

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
