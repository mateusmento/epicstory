import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { create } from 'src/core/objects';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  CreateIssue,
  FindBacklogItems,
  FindIssues,
  FindProject,
  RemoveProject,
} from '../features';

@Controller('projects')
export class ProjectController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findProject(@Param('id') projectId: number) {
    return this.queryBus.execute(new FindProject({ projectId }));
  }

  @Get(':id/backlog-items')
  @UseGuards(JwtAuthGuard)
  findProjectBacklogItems(
    @Param('id') projectId: number,
    @Query() query: FindBacklogItems,
  ) {
    return this.queryBus.execute(new FindBacklogItems({ ...query, projectId }));
  }

  @Get(':id/issues')
  @UseGuards(JwtAuthGuard)
  findIssues(@Param('id') projectId: number, @Query() query: FindIssues) {
    return this.queryBus.execute(new FindIssues({ projectId, ...query }));
  }

  @Post(':id/issues')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  createIssue(
    @Param('id') projectId: number,
    @Body() data,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateIssue({ ...data, projectId, issuer }),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeProject(@Param('id') projectId: number) {
    return this.commandBus.execute(create(RemoveProject, { projectId }));
  }
}
