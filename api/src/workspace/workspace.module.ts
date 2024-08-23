import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './application/controllers/workspace.controller';
import { AddWorkspaceMemberCommand } from './application/features/workspace/add-workspace-member.command';
import { CreateProjectCommand } from './application/features/create-project.command';
import { CreateTeamCommand } from './application/features/team/create-team.command';
import { CreateWorkspaceCommand } from './application/features/workspace/create-workspace.command';
import { FindProjectsQuery } from './application/features/project/find-projects.query';
import { FindWorkspaceMemberQuery } from './application/features/workspace/find-workspace-members.query';
import { FindWorkspacesQuery } from './application/features/workspace/find-workspaces.query';
import { RemoveWorkspaceMemberCommand } from './application/features/workspace/remove-workspace.member.command';
import { UpdateWorkspaceMemberCommand } from './application/features/workspace/update-workspace-member.command';
import { UserCreatedReaction } from './application/reactions/user-created.reaction';
import { Project } from './domain/entities/project.entity';
import { Team } from './domain/entities/team.entity';
import { WorkspaceMember } from './domain/entities/workspace-member.entity';
import { Workspace } from './domain/entities/workspace.entity';
import { ProjectRepository } from './infrastructure/repositories/project.repository';
import { TeamRepository } from './infrastructure/repositories/team.repository';
import { WorkspaceMemberRepository } from './infrastructure/repositories/workspace-member.repository';
import { WorkspaceRepository } from './infrastructure/repositories/workspace.repository';
import { FindTeamsQuery } from './application/features/team/find-teams.query';

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
  exports: [WorkspaceRepository],
})
export class WorkspaceModule {}
