import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './application/controllers';
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
  controllers: [WorkspaceController],
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
  ],
  exports: [WorkspaceRepository],
})
export class WorkspaceModule {}
