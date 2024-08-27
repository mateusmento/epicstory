import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  WorkspaceController,
  ProjectController,
} from './application/controllers';
import {
  AddWorkspaceMemberCommand,
  CreateIssueCommand,
  CreateProjectCommand,
  CreateTeamCommand,
  CreateWorkspaceCommand,
  FindIssuesQuery,
  FindProjectsQuery,
  FindTeamsQuery,
  FindWorkspaceMemberQuery,
  FindWorkspacesQuery,
  RemoveWorkspaceMemberCommand,
  UpdateWorkspaceMemberCommand,
} from './application/features';
import { UserCreatedReaction } from './application/reactions';
import {
  Issue,
  Project,
  Team,
  Workspace,
  WorkspaceMember,
} from './domain/entities';
import {
  IssueRepository,
  ProjectRepository,
  TeamRepository,
  WorkspaceMemberRepository,
  WorkspaceRepository,
} from './infrastructure/repositories';
import { IssueController } from './application/controllers/issue.controller';
import { UpdateIssueCommand } from './application/features/issue/update-issue.command';
import { RemoveIssueCommand } from './application/features/issue/remove-issue.command';
import { AddAssigneeCommand } from './application/features/issue/add-assignee.command';
import { AuthModule } from 'src/auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      Project,
      Team,
      Issue,
    ]),
    AuthModule,
  ],
  controllers: [WorkspaceController, ProjectController, IssueController],
  providers: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    ProjectRepository,
    TeamRepository,
    IssueRepository,
    FindWorkspacesQuery,
    CreateWorkspaceCommand,
    FindWorkspaceMemberQuery,
    AddWorkspaceMemberCommand,
    RemoveWorkspaceMemberCommand,
    UpdateWorkspaceMemberCommand,
    FindProjectsQuery,
    CreateProjectCommand,
    FindTeamsQuery,
    CreateTeamCommand,
    UserCreatedReaction,
    FindIssuesQuery,
    CreateIssueCommand,
    UpdateIssueCommand,
    RemoveIssueCommand,
    AddAssigneeCommand,
  ],
  exports: [WorkspaceRepository],
})
export class WorkspaceModule {}
