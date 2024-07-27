import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { WorkspaceRole } from '../values/workspace-role.value';

@Entity({ schema: WORKSPACE_SCHEMA })
export class WorkspaceMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  userId: number;

  @Column()
  role: WorkspaceRole;

  static create(data: {
    userId: number;
    workspaceId?: number;
    role: WorkspaceRole;
  }) {
    return create(WorkspaceMember, data);
  }

  hasRole(role: WorkspaceRole) {
    return this.role === role;
  }
}
