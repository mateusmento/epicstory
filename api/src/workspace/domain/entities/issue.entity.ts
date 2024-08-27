import { User } from 'src/auth';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ schema: 'workspace' })
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

  @ManyToMany(() => User)
  @JoinTable({
    name: 'issue_assignee',
    joinColumn: { name: 'issue_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  assignees: User[];
}
