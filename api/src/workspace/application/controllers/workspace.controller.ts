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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Auth, Issuer } from 'src/core/auth/auth-user';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { ExceptionFilter } from 'src/core/convert-exception.filter';
import { IssuerUserCanNotAddWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-can-not-add-workspace-member';
import { IssuerUserCanNotCreateProject } from 'src/workspace/domain/exceptions/issuer-user-can-not-create-project';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions/issuer-user-is-not-workspace-member';
import { WorkspaceMemberAlreadyExists } from 'src/workspace/domain/exceptions/workspace-member-already-exists';
import { AddWorkspaceMember } from '../features/workspace/add-workspace-member.command';
import { CreateProject } from '../features/project/create-project.command';
import { CreateTeam } from '../features/team/create-team.command';
import { CreateWorkspace } from '../features/workspace/create-workspace.command';
import { FindProjects } from '../features/project/find-projects.query';
import { FindWorkspaceMembers } from '../features/workspace/find-workspace-members.query';
import { FindWorkspaces } from '../features/workspace/find-workspaces.query';
import { RemoveWorkspaceMember } from '../features/workspace/remove-workspace.member.command';
import { UpdateWorkspaceMember } from '../features/workspace/update-workspace-member.command';
import { FindTeams } from '../features/team/find-teams.query';

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
