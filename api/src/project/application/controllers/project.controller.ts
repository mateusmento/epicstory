import {
  Body,
  Controller,
  Delete,
  BadRequestException,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { create } from 'src/core/objects';
import { IssuerUserCanNotCreateProject } from 'src/project/domain/exceptions';
import {
  IssuerUserIsNotWorkspaceMember,
  TeamNotFound,
} from 'src/workspace/domain/exceptions';
import {
  CreateIssue,
  FindIssues,
  FindProject,
  RecordProjectAccess,
  RemoveProject,
  UpdateProjectTeam,
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

  @Put(':id/access')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [ForbiddenException, ForbiddenException],
    [NotFoundException, NotFoundException],
  )
  recordAccess(@Param('id') projectId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new RecordProjectAccess({ projectId, issuerId: issuer.id }),
    );
  }

  @Patch(':id/team')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [IssuerUserCanNotCreateProject, ForbiddenException],
    [TeamNotFound, NotFoundException],
    [BadRequestException, BadRequestException],
    [NotFoundException, NotFoundException],
  )
  updateProjectTeam(
    @Param('id') projectId: number,
    @Body() data: UpdateProjectTeam,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateProjectTeam({ ...data, projectId, issuerId: issuer.id }),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeProject(@Param('id') projectId: number) {
    return this.commandBus.execute(create(RemoveProject, { projectId }));
  }
}
