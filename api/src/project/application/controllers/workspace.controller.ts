import {
  Body,
  ConflictException,
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
import { IsNotEmpty, IsString } from 'class-validator';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  CreateLabel,
  CreateProject,
  FindIssues,
  FindLabels,
  FindProjects,
  FindRecentProjects,
  UpdateLabel,
} from '../features';
import { ExceptionFilter } from 'src/core';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { IssuerUserCanNotCreateProject } from 'src/project/domain/exceptions';
import { TeamNotFound } from 'src/workspace/domain/exceptions';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories/workspace.repository';
import { IssueKeyAllocationService } from 'src/project/application/services/issue-key-allocation.service';

class SuggestProjectKeyPrefixQuery {
  @IsString()
  @IsNotEmpty()
  name: string;
}

@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
    private workspaceRepo: WorkspaceRepository,
    private issueKeys: IssueKeyAllocationService,
  ) {}

  @Get(':id/projects')
  @UseGuards(JwtAuthGuard)
  findProjects(@Param('id') workspaceId: number, @Query() query: FindProjects) {
    return this.queryBus.execute(new FindProjects({ ...query, workspaceId }));
  }

  @Get(':id/projects/recent')
  @UseGuards(JwtAuthGuard)
  findRecentProjects(
    @Param('id') workspaceId: number,
    @Query('count') count: number,
    @Auth() issuer: Issuer,
  ) {
    return this.queryBus.execute(
      new FindRecentProjects({ workspaceId, issuerId: issuer.id, count }),
    );
  }

  @Post(':id/projects')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [IssuerUserCanNotCreateProject, ForbiddenException],
    [TeamNotFound, NotFoundException],
    [ConflictException, ConflictException],
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

  /** Suggests a unique project key prefix for the given name. */
  @Get(':id/projects/suggest-key')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async suggestProjectKeyPrefix(
    @Param('id') workspaceId: number,
    @Query() query: SuggestProjectKeyPrefixQuery,
    @Auth() issuer: Issuer,
  ): Promise<{ issueKeyPrefix: string }> {
    await this.workspaceRepo.requiresMembership(workspaceId, issuer.id);
    const issueKeyPrefix = await this.issueKeys.suggestUniquePrefix({
      workspaceId,
      projectName: query.name,
    });
    return { issueKeyPrefix };
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
