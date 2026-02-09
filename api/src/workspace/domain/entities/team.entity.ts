import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  static create(data: { name: string; workspaceId: number }) {
    return create(Team, data);
  }
}
