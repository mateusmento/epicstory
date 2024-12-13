import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import {
  WorkspaceController,
  WorkspaceMemberInviteController,
} from './application/controllers';
import {
  AcceptWorkspaceMemberInviteCommand,
  AddWorkspaceMemberCommand,
  CreateTeamCommand,
  CreateWorkspaceCommand,
  FindTeamsQuery,
  FindWorkspaceMemberQuery,
  FindWorkspacesQuery,
  RemoveWorkspaceMemberCommand,
  SendWorkspaceMemberInviteCommand,
  UpdateWorkspaceMemberCommand,
} from './application/features';
import { UserCreatedReaction } from './application/reactions';
import {
  Team,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberInvite,
} from './domain/entities';
import {
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
      Team,
    ]),
    AuthModule,
  ],
  controllers: [WorkspaceController, WorkspaceMemberInviteController],
  providers: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    WorkspaceMemberInviteRepository,
    TeamRepository,
    FindWorkspacesQuery,
    CreateWorkspaceCommand,
    FindWorkspaceMemberQuery,
    AddWorkspaceMemberCommand,
    SendWorkspaceMemberInviteCommand,
    AcceptWorkspaceMemberInviteCommand,
    RemoveWorkspaceMemberCommand,
    UpdateWorkspaceMemberCommand,
    FindTeamsQuery,
    CreateTeamCommand,
    UserCreatedReaction,
  ],
  exports: [WorkspaceRepository],
})
export class WorkspaceModule {}
