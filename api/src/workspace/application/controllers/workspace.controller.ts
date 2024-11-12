import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateWorkspace } from '../features/create-workspace.command';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateProject } from '../features/create-project.command';
import { AddWorkspaceMember } from '../features/add-workspace-member.command';
import { ExceptionFilter } from 'src/core/convert-exception.filter';
import { IssuerUserCanNotAddWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-can-not-add-workspace-member';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceMemberAlreadyExists } from 'src/workspace/domain/exceptions/workspace-member-already-exists';
import { IssuerUserCanNotCreateProject } from 'src/workspace/domain/exceptions/issuer-user-can-not-create-project';
import { Auth, Issuer } from 'src/core/auth-user';
import { JwtAuthGuard } from 'src/auth/application/passport/jwt.strategy';
import { RemoveWorkspaceMember } from '../features/remove-workspace.member.command';
import { UpdateWorkspaceMember } from '../features/update-workspace-member.command';
import { CreateTeam } from '../features/create-team.command';
import { FindWorkspaces } from '../features/find-workspaces.query';
import { FindProjects } from '../features/find-projects.query';
import { FindWorkspaceMembers } from '../features/find-workspace-members.query';

@Controller('workspaces')
export class WorkspaceController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findWorkspaces(@Auth() issuer: Issuer) {
    return this.queryBus.execute(new FindWorkspaces({ issuerId: issuer.id }));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() command: CreateWorkspace, @Auth() issuer: Issuer) {
    return this.commandBus.execute(
      new CreateWorkspace({ ...command, issuerId: issuer.id }),
    );
  }

  @Get(':id/projects')
  @UseGuards(JwtAuthGuard)
  findProjects(@Param('id') workspaceId: number) {
    return this.queryBus.execute(new FindProjects({ workspaceId }));
  }

  @Post(':id/projects')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter(
    [IssuerUserIsNotWorkspaceMember, ForbiddenException],
    [IssuerUserCanNotCreateProject, ForbiddenException],
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

  @Post(':id/teams')
  @UseGuards(JwtAuthGuard)
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
