import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Backlog } from './backlog.entity';

@Entity({ schema: WORKSPACE_SCHEMA, name: 'workspace_project' })
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  workspaceId: number;

  @Column()
  backlogId: number;

  @ManyToOne(() => Backlog, { cascade: ['insert'] })
  backlog: Backlog;

  static create(data: { name: string; workspaceId: number; backlog: Backlog }) {
    return create(Project, data);
  }
}
