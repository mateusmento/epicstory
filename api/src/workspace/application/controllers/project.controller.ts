import {
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateIssue } from '../features';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { ExceptionFilter } from 'src/core';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';

@Controller('projects')
export class ProjectController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Post(':id/issues')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  createIssue(@Body() data, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new CreateIssue({ ...data, issuer }));
  }
}
