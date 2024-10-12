import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import {
  IssueController,
  ProjectController,
  WorkspaceController,
  WorkspaceMemberInviteController,
} from './application/controllers';
import {
  AcceptWorkspaceMemberInviteCommand,
  AddAssigneeCommand,
  AddWorkspaceMemberCommand,
  CreateIssueCommand,
  CreateProjectCommand,
  CreateTeamCommand,
  CreateWorkspaceCommand,
  FindIssueQuery,
  FindIssuesQuery,
  FindProjectsQuery,
  FindTeamsQuery,
  FindWorkspaceMemberQuery,
  FindWorkspacesQuery,
  RemoveIssueCommand,
  RemoveWorkspaceMemberCommand,
  SendWorkspaceMemberInviteCommand,
  UpdateIssueCommand,
  UpdateWorkspaceMemberCommand,
} from './application/features';
import { UserCreatedReaction } from './application/reactions';
import {
  Issue,
  Project,
  Team,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberInvite,
} from './domain/entities';
import {
  IssueRepository,
  ProjectRepository,
  TeamRepository,
  WorkspaceMemberInviteRepository,
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from './infrastructure/repositories';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      WorkspaceMemberInvite,
      Project,
      Team,
      Issue,
    ]),
    AuthModule,
  ],
  controllers: [
    WorkspaceController,
    WorkspaceMemberInviteController,
    ProjectController,
    IssueController,
  ],
  providers: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    WorkspaceMemberInviteRepository,
    ProjectRepository,
    TeamRepository,
    IssueRepository,
    FindWorkspacesQuery,
    CreateWorkspaceCommand,
    FindWorkspaceMemberQuery,
    AddWorkspaceMemberCommand,
    SendWorkspaceMemberInviteCommand,
    AcceptWorkspaceMemberInviteCommand,
    RemoveWorkspaceMemberCommand,
    UpdateWorkspaceMemberCommand,
    FindProjectsQuery,
    CreateProjectCommand,
    FindTeamsQuery,
    CreateTeamCommand,
    UserCreatedReaction,
    FindIssuesQuery,
    FindIssueQuery,
    CreateIssueCommand,
    UpdateIssueCommand,
    RemoveIssueCommand,
    AddAssigneeCommand,
  ],
  exports: [WorkspaceRepository],
})
export class WorkspaceModule {}
