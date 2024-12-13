import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { CreateProject, FindIssues, FindProjects } from '../features';
import { ExceptionFilter } from 'src/core';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { IssuerUserCanNotCreateProject } from 'src/project/domain/exceptions';
import { TeamNotFound } from 'src/workspace/domain/exceptions';

@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id/projects')
  @UseGuards(JwtAuthGuard)
  findProjects(@Param('id') workspaceId: number, @Query() query: FindProjects) {
    return this.queryBus.execute(new FindProjects({ ...query, workspaceId }));
  }

  @Post(':id/projects')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [IssuerUserCanNotCreateProject, ForbiddenException],
    [TeamNotFound, NotFoundException],
  )
  createProject(
    @Param('id') workspaceId: number,
    @Body() command: CreateProject,
    @Auth() issuer: Issuer,
  ) {
    command = new CreateProject({
      ...command,
      workspaceId,
      issuerId: issuer.id,
    });
    return this.commandBus.execute(command);
  }

  @Get(':id/issues')
  @UseGuards(JwtAuthGuard)
  findIssues(@Param('id') workspaceId: number, @Query() query: FindIssues) {
    return this.queryBus.execute(new FindIssues({ workspaceId, ...query }));
  }
}
