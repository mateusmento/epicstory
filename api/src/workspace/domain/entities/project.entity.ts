import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: WORKSPACE_SCHEMA, name: 'workspace_project' })
export class Project {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  workspaceId: number;

  static create(data: { name: string; workspaceId: number }) {
    return create(Project, data);
  }
}
