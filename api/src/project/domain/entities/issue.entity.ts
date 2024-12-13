import { User } from 'src/auth';
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

  @Column({ nullable: true })
  priority: number | null;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'issue_assignee',
    joinColumn: { name: 'issue_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  assignees: User[];
}
