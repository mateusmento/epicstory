import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { UpdateIssue, RemoveIssue, AddAssignee } from '../features';

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

  @Post(':id/assignees')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  addAssignee(
    @Param('id') issueId: number,
    @Body() data: AddAssignee,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new AddAssignee({ ...data, issueId, issuer }),
    );
  }
}
