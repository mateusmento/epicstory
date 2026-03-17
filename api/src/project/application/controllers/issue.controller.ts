import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import {
  UpdateIssue,
  RemoveIssue,
  AddAssignee,
  AddLabel,
  RemoveLabel,
} from '../features';
import { FindIssue } from '../features/issue/find-issue.query';

@Controller('issues')
export class IssueController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findIssue(@Param('id') issueId: number) {
    return this.queryBus.execute(new FindIssue({ issueId }));
  }

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

  @Post(':id/labels')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  addLabel(
    @Param('id') issueId: number,
    @Body() data: AddLabel,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(new AddLabel({ ...data, issueId, issuer }));
  }

  @Delete(':id/labels/:labelId')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  removeLabel(
    @Param('id') issueId: number,
    @Param('labelId') labelId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveLabel({ issueId, labelId, issuer }),
    );
  }
}
