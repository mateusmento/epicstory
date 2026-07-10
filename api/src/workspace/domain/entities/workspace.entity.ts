import { create } from 'src/core/objects';
import { Project } from 'src/project/domain/entities';
import { IssuerUserCanNotCreateProject } from 'src/project/domain/exceptions/issuer-user-can-not-create-project';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IssuerCanNotCreateTeam } from '../exceptions/issuer-can-not-create-team';
import { WorkspaceMemberAlreadyExists } from '../exceptions/workspace-member-already-exists';
import { AddWorkspaceMemberPrerequisite } from '../values/add-workspace-member-prerequisite.value';
import { WorkspaceRole } from '../values/workspace-role.value';
import {
  WorkspaceStatus,
  type WorkspaceStatus as WorkspaceStatusType,
} from '../values/workspace-status.value';
import { Team } from './team.entity';
import { WorkspaceMember } from './workspace-member.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: WorkspaceStatus.ACTIVE })
  status: WorkspaceStatusType;

  @Column({
    name: 'deletion_requested_at',
    type: 'timestamptz',
    nullable: true,
  })
  deletionRequestedAt?: Date | null;

  @Column({ name: 'deletion_requested_by_user_id', nullable: true })
  deletionRequestedByUserId?: number | null;

  onlineUsersSnapshot: number[];

  static create(data: { name: string }) {
    return create(Workspace, {
      ...data,
      status: WorkspaceStatus.ACTIVE,
    });
  }

  get isDeleting() {
    return this.status === WorkspaceStatus.DELETING;
  }

  addMember(
    prerequisite: AddWorkspaceMemberPrerequisite,
    userId: number,
    role?: WorkspaceRole,
  ) {
    if (prerequisite.memberExists) throw new WorkspaceMemberAlreadyExists();
    return WorkspaceMember.create({
      workspaceId: this.id,
      userId,
      role: role ?? WorkspaceRole.COLLABORATOR,
    });
  }

  createProject(issuer: WorkspaceMember, teamId: number, name: string) {
    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new IssuerUserCanNotCreateProject();
    return Project.create({
      workspaceId: this.id,
      teamId,
      name,
    });
  }

  createTeam(issuer: WorkspaceMember, name: string) {
    if (!issuer.hasRole(WorkspaceRole.ADMIN))
      throw new IssuerCanNotCreateTeam();
    return Team.create({ workspaceId: this.id, name });
  }
}
