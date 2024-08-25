import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { UpdateIssue } from '../features/issue/update-issue.command';
import { RemoveIssue } from '../features/issue/remove-issue.command';

@Controller('issues')
export class IssueController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  updateIssue(
    @Param('id') issueId: number,
    @Body() data: UpdateIssue,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new UpdateIssue({ ...data, issueId, issuer }),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  removeIssue(@Param('id') issueId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(new RemoveIssue({ issueId, issuer }));
  }
}
