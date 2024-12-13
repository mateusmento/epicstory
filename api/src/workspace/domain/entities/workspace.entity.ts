import { create } from 'src/core/objects';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IssuerCanNotCreateTeam } from '../exceptions/issuer-can-not-create-team';
import { IssuerUserCanNotAddWorkspaceMember } from '../exceptions/issuer-user-can-not-add-workspace-member';
import { IssuerUserCanNotCreateProject } from 'src/project/domain/exceptions/issuer-user-can-not-create-project';
import { IssuerUserIsNotWorkspaceMember } from '../exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceMemberAlreadyExists } from '../exceptions/workspace-member-already-exists';
import { AddWorkspaceMemberPrerequisite } from '../values/add-workspace-member-prerequisite.value';
import { WorkspaceRole } from '../values/workspace-role.value';
import { Project } from 'src/project/domain/entities';
import { Team } from './team.entity';
import { WorkspaceMember } from './workspace-member.entity';

@Entity({ schema: WORKSPACE_SCHEMA })
export class Workspace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  static create(data: { name: string }) {
    return create(Workspace, data);
  }

  addMember(
    prerequisite: AddWorkspaceMemberPrerequisite,
    userId: number,
    role?: WorkspaceRole,
  ) {
    if (!prerequisite.issuerIsWorkspaceMember)
      throw new IssuerUserIsNotWorkspaceMember();
    if (!prerequisite.issuer?.hasRole(WorkspaceRole.ADMIN))
      throw new IssuerUserCanNotAddWorkspaceMember();
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
