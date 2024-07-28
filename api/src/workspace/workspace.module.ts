import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './application/controllers/workspace.controller';
import { AddWorkspaceMemberCommand } from './application/features/add-workspace-member.command';
import { CreateProjectCommand } from './application/features/create-project.command';
import { CreateTeamCommand } from './application/features/create-team.command';
import { CreateWorkspaceCommand } from './application/features/create-workspace.command';
import { FindProjectsQuery } from './application/features/find-projects.query';
import { FindWorkspaceMemberQuery } from './application/features/find-workspace-members.query';
import { FindWorkspacesQuery } from './application/features/find-workspaces.query';
import { RemoveWorkspaceMemberCommand } from './application/features/remove-workspace.member.command';
import { UpdateWorkspaceMemberCommand } from './application/features/update-workspace-member.command';
import { UserCreatedReaction } from './application/reactions/user-created.reaction';
import { Project } from './domain/entities/project.entity';
import { Team } from './domain/entities/team.entity';
import { WorkspaceMember } from './domain/entities/workspace-member.entity';
import { Workspace } from './domain/entities/workspace.entity';
import { ProjectRepository } from './infrastructure/repositories/project.repository';
import { TeamRepository } from './infrastructure/repositories/team.repository';
import { WorkspaceMemberRepository } from './infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from './infrastructure/repositories/workspace.repository';
import { FindTeamsQuery } from './application/features/find-teams.query';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, Project, Team]),
  ],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    ProjectRepository,
    TeamRepository,
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
  ],
})
export class WorkspaceModule {}
