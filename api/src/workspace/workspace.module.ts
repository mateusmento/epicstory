import { Module } from '@nestjs/common';
import { WorkspaceController } from './application/controllers/workspace.controller';
import { CreateWorkspaceCommand } from './application/features/create-workspace.command';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './domain/entities/workspace.entity';
import { WorkspaceRepository } from './infrastructure/repositories/workspace.repository';
import { Project } from './domain/entities/project.entity';
import { CreateProjectCommand } from './application/features/create-project.command';
import { AddWorkspaceMemberCommand } from './application/features/add-workspace-member.command';
import { WorkspaceMemberRepository } from './infrastructure/repositories/workspace-member.repository';
import { ProjectRepository } from './infrastructure/repositories/project.repository';
import { WorkspaceMember } from './domain/entities/workspace-member.entity';
import { RemoveWorkspaceMemberCommand } from './application/features/remove-workspace.member.command';
import { UpdateWorkspaceMemberCommand } from './application/features/update-workspace-member.command';
import { CreateTeamCommand } from './application/features/create-team.command';
import { TeamRepository } from './infrastructure/repositories/team.repository';
import { Team } from './domain/entities/team.entity';
import { FindWorkspacesQuery } from './application/features/find-workspaces.query';
import { FindProjectsQuery } from './application/features/find-projects.query';
import { FindWorkspaceMemberQuery } from './application/features/find-workspace-members.query';

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
    CreateTeamCommand,
  ],
})
export class WorkspaceModule {}
