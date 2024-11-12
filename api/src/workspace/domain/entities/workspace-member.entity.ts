import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WorkspaceRole } from '../values/workspace-role.value';
import { User } from 'src/user/domain/entities/user.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class WorkspaceMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

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
