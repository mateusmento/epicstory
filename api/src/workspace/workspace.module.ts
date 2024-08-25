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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Workspace,
      WorkspaceMember,
      Project,
      Team,
      Issue,
    ]),
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
  ],
  exports: [WorkspaceRepository],
})
export class WorkspaceModule {}
