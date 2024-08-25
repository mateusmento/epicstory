import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateIssue, FindIssues } from '../features';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { ExceptionFilter } from 'src/core';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';

@Controller('projects')
export class ProjectController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

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
}
