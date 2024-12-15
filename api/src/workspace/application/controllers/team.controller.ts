import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { Issue } from 'src/project/domain/entities';
import {
  IssuerUserIsNotWorkspaceMember,
  TeamNotFound,
} from 'src/workspace/domain/exceptions';
import { AddTeamMember, FindTeam, FindTeamMembers } from '../features';
import { RemoveTeam } from '../features/team/remove-team.command';

@Controller('teams')
export class TeamController {
  constructor(
    private queryBus: QueryBus,
    private commandBus: CommandBus,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([TeamNotFound, NotFoundException])
  findTeam(@Param('id') teamId: number) {
    return this.queryBus.execute(new FindTeam(teamId));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [TeamNotFound, NotFoundException],
  )
  removeTeam(@Param('id') teamId: number, @Auth() issuer: Issue) {
    return this.commandBus.execute(
      new RemoveTeam({ teamId, issuerId: issuer.id }),
    );
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter()
  findTeamMembers(@Param('id') teamId: number, @Auth() issuer: Issuer) {
    return this.queryBus.execute(new FindTeamMembers({ teamId, issuer }));
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [TeamNotFound, NotFoundException],
  )
  addMember(
    @Param('id') teamId: number,
    @Body() command: AddTeamMember,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new AddTeamMember({ ...command, teamId, issuerId: issuer.id }),
    );
  }
}
