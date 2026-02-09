import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WorkspaceRole } from '../values/workspace-role.value';
import { User } from 'src/auth/domain/entities/user.entity';
import { Workspace } from '.';

@Entity({ schema: WORKSPACE_SCHEMA })
export class WorkspaceMember {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  workspaceId: number;

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  workspace: Workspace;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  role: WorkspaceRole;

  @Column({ default: 'now()' })
  joinedAt: Date;

  static create(data: {
    userId: number;
    workspaceId?: number;
    role: WorkspaceRole;
    joinedAt?: Date;
  }) {
    return create(WorkspaceMember, data);
  }

  hasRole(role: WorkspaceRole) {
    return this.role === role;
  }
}
