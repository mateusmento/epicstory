import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Logger,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Auth, Issuer } from 'src/core/auth';
import { LinearConnectionRepository } from '../repositories';
import { LinearOAuthService, LinearTokenCryptoService } from '../services';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';

@Controller('integrations/linear/workspaces')
export class LinearConnectionController {
  private readonly logger = new Logger(LinearConnectionController.name);

  constructor(
    private connectionRepo: LinearConnectionRepository,
    private workspaceRepo: WorkspaceRepository,
    private oauth: LinearOAuthService,
    private crypto: LinearTokenCryptoService,
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

    // Revoke at Linear so the next Connect isn't a silent auto-approve.
    try {
      if (connection.refreshTokenEncrypted) {
        await this.oauth.revokeToken(
          this.crypto.decrypt(connection.refreshTokenEncrypted),
          'refresh_token',
        );
      } else if (connection.accessTokenEncrypted) {
        await this.oauth.revokeToken(
          this.crypto.decrypt(connection.accessTokenEncrypted),
          'access_token',
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Linear token revoke on disconnect failed: ${msg}`);
    }

    await this.connectionRepo.delete({ id: connection.id });
  }
}
