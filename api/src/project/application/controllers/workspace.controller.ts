import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  CreateLabel,
  CreateProject,
  FindIssues,
  FindLabels,
  FindProjects,
  UpdateLabel,
} from '../features';
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

  @Get(':id/labels')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  findLabels(@Param('id') workspaceId: number, @Auth() issuer: Issuer) {
    return this.queryBus.execute(new FindLabels({ workspaceId, issuer }));
  }

  @Post(':id/labels')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  createLabel(
    @Param('id') workspaceId: number,
    @Body() data: CreateLabel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateLabel({ ...data, workspaceId, issuer }),
    );
  }

  @Patch(':id/labels/:labelId')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  updateLabel(
    @Param('id') workspaceId: number,
    @Param('labelId') labelId: number,
    @Body() data: UpdateLabel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateLabel({ ...data, workspaceId, labelId, issuer }),
    );
  }
}
