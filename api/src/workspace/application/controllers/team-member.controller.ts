import {
  Controller,
  Delete,
  ForbiddenException,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import { RemoveTeamMember } from '../features';
import { ExceptionFilter } from 'src/core';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';

@Controller('team-members')
export class TeamMemberController {
  constructor(private commandBus: CommandBus) {}

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  removeMember(@Param('id') teamMemberId: number, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new RemoveTeamMember({ teamMemberId, issuerId: issuer.id }),
    );
  }
}
