import { create } from 'src/core/objects';
import { PROJECT_SCHEMA } from 'src/project/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Backlog } from './backlog.entity';

@Entity({ schema: PROJECT_SCHEMA, name: 'workspace_project' })
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  workspaceId: number;

  @Column({ nullable: true })
  teamId?: number;

  @Column({ nullable: true })
  backlogId: number;

  @ManyToOne(() => Backlog, { cascade: ['insert'] })
  backlog: Backlog;

  static create(data: { name: string; workspaceId: number; teamId?: number }) {
    return create(Project, data);
  }
}
