import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth';
import {
  BacklogItemController,
  IssueController,
  ProjectController,
  WorkspaceController,
} from './application/controllers';
import {
  AddAssigneeCommand,
  CreateBacklogItemCommand,
  CreateIssueCommand,
  CreateProjectCommand,
  FindBacklogItemsQuery,
  FindIssueQuery,
  FindIssuesQuery,
  FindProjectBacklogItemsQuery,
  FindProjectQuery,
  FindProjectsQuery,
  MoveBacklogItemCommand,
  RemoveIssueCommand,
  UpdateIssueCommand,
} from './application/features';
import { RemoveBacklogItemCommand } from './application/features/backlog/remove-backlog-item.command';
import { RemoveProjectCommand } from './application/features/project/remove-project.command';
import { Backlog, BacklogItem, Issue, Project } from './domain/entities';
import {
  BacklogItemRepository,
  BacklogRepository,
  IssueRepository,
  ProjectRepository,
} from './infrastructure/repositories';
import { WorkspaceModule } from 'src/workspace/workspace.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Issue, Backlog, BacklogItem]),
    AuthModule,
    WorkspaceModule,
  ],
  controllers: [
    ProjectController,
    WorkspaceController,
    IssueController,
    BacklogItemController,
  ],
  providers: [
    ProjectRepository,
    IssueRepository,
    BacklogRepository,
    BacklogItemRepository,
    FindProjectsQuery,
    CreateProjectCommand,
    FindIssuesQuery,
    FindIssueQuery,
    CreateIssueCommand,
    UpdateIssueCommand,
    RemoveIssueCommand,
    AddAssigneeCommand,
    FindBacklogItemsQuery,
    CreateBacklogItemCommand,
    RemoveBacklogItemCommand,
    MoveBacklogItemCommand,
    FindProjectQuery,
    FindProjectBacklogItemsQuery,
    RemoveProjectCommand,
  ],
  exports: [],
})
export class ProjectModule {}
