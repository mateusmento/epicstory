import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExceptionFilter } from 'src/core';
import { Auth, Issuer, JwtAuthGuard } from 'src/core/auth';
import {
  IssuerUserCanNotAddWorkspaceMember,
  IssuerUserIsNotWorkspaceMember,
  WorkspaceMemberAlreadyExists,
} from 'src/workspace/domain/exceptions';
import {
  AddWorkspaceMember,
  CreateTeam,
  CreateWorkspace,
  FindTeams,
  FindWorkspace,
  FindWorkspaceMembers,
  FindWorkspaces,
  RemoveWorkspaceMember,
  SendWorkspaceMemberInvite,
  UpdateWorkspaceMember,
  WorkspaceNotFound,
} from '../features';

@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async findWorkspaces(@Auth() issuer: Issuer) {
    const content = await this.queryBus.execute(
      new FindWorkspaces({ issuerId: issuer.id }),
    );
    return { content };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [WorkspaceNotFound, NotFoundException],
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
  )
  findWorkspace(@Param('id') workspaceId: number, @Auth() issuer: Issuer) {
    return this.queryBus.execute(
      new FindWorkspace({ workspaceId, issuerId: issuer.id }),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() command: CreateWorkspace, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new CreateWorkspace({ ...command, issuerId: issuer.id }),
    );
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  findMembers(@Param('id') workspaceId: number) {
    return this.queryBus.execute(new FindWorkspaceMembers({ workspaceId }));
  }

  @Post(':id/members')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [IssuerUserCanNotAddWorkspaceMember, ForbiddenException],
    [WorkspaceMemberAlreadyExists, ConflictException],
  )
  addMember(
    @Param('id') workspaceId: number,
    @Body() command: AddWorkspaceMember,
    @Auth() issuer: Issuer,
  ) {
    command = new AddWorkspaceMember({
      ...command,
      workspaceId,
      issuerId: issuer.id,
    });
    return this.commandBus.execute(command);
  }

  @Post(':id/member-invites')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [IssuerUserCanNotAddWorkspaceMember, ForbiddenException],
    [WorkspaceMemberAlreadyExists, ConflictException],
  )
  sendMemberInvite(
    @Param('id') workspaceId: number,
    @Body() command: SendWorkspaceMemberInvite,
    @Auth() issuer: Issuer,
  ) {
    command = new SendWorkspaceMemberInvite({
      ...command,
      workspaceId,
      issuer,
    });
    return this.commandBus.execute(command);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  updateMember(
    @Param('id') workspaceId: number,
    @Param('memberId') memberId: number,
    @Auth() issuer: Issuer,
    @Body() command: UpdateWorkspaceMember,
  ) {
    return this.commandBus.execute(
      new UpdateWorkspaceMember({
        ...command,
        issuerId: issuer.id,
        workspaceId,
        memberId,
      }),
    );
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  removeMember(
    @Param('id') workspaceId: number,
    @Param('memberId') memberId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new RemoveWorkspaceMember({ workspaceId, memberId, issuerId: issuer.id }),
    );
  }

  @Get(':id/teams')
  @UseGuards(JwtAuthGuard)
  findTeams(@Param('id') workspaceId: number, @Auth() issuer: Issuer) {
    return this.queryBus.execute(new FindTeams({ workspaceId, issuer }));
  }

  @Post(':id/teams')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  createTeam(
    @Param('id') workspaceId: number,
    @Body() command: CreateTeam,
    @Auth() issuer: Issuer,
  ) {
    return this.commandBus.execute(
      new CreateTeam({ ...command, workspaceId, issuerId: issuer.id }),
    );
  }
}
