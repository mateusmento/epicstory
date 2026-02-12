import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Auth, Issuer } from 'src/core/auth';
import { LinearConnectionRepository } from '../repositories';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';

@Controller('integrations/linear/workspaces')
export class LinearConnectionController {
  constructor(
    private connectionRepo: LinearConnectionRepository,
    private workspaceRepo: WorkspaceRepository,
  ) {}

  @Get(':workspaceId/connection')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async getConnection(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const connection =
      await this.connectionRepo.findWorkspaceConnection(workspaceId);
    if (!connection) return null;

    // Do not return tokens.
    const safe = { ...(connection as any) };
    delete safe.accessTokenEncrypted;
    delete safe.refreshTokenEncrypted;
    return safe;
  }

  @Delete(':workspaceId/connection')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async disconnect(
    @Param('workspaceId') workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    const isMember = await this.workspaceRepo.memberExists(
      workspaceId,
      issuer.id,
    );
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();

    const connection =
      await this.connectionRepo.findWorkspaceConnection(workspaceId);
    if (!connection) return;

    await this.connectionRepo.delete({ id: connection.id });
  }
}
