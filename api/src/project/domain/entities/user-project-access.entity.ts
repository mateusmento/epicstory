import { PROJECT_SCHEMA } from 'src/project/constants';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from './project.entity';

@Entity({ schema: PROJECT_SCHEMA, name: 'user_project_access' })
@Unique(['userId', 'projectId'])
export class UserProjectAccess {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  project: Project;

  @UpdateDateColumn({ name: 'accessed_at', type: 'timestamptz' })
  accessedAt: Date;
}
