import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Backlog } from './backlog.entity';
import { PROJECT_SCHEMA } from 'src/project/constants';

@Entity({ schema: PROJECT_SCHEMA })
export class Sprint {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  projectId: number;

  @Column()
  backlogId: number;

  @ManyToOne(() => Backlog, { cascade: ['insert'] })
  backlog: Backlog;

  @Column()
  createdById: number;

  @CreateDateColumn()
  createdAt: Date;
}
