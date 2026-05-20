import {
  Controller,
  DefaultValuePipe,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { GithubWorkspaceIntegrationService } from '../services';

@Controller('integrations/github/workspaces')
export class GithubIntegrationController {
  constructor(
    private readonly githubWorkspaceIntegration: GithubWorkspaceIntegrationService,
  ) {}

  @Get(':workspaceId/status')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async getStatus(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.githubWorkspaceIntegration.getIntegrationStatus(
      workspaceId,
      issuer.id,
    );
  }

  @Get(':workspaceId/repositories')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listRepositories(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(30), ParseIntPipe)
    perPageRaw: number,
    @Auth() issuer: Issuer,
  ) {
    return this.githubWorkspaceIntegration.listInstallationRepositoryCatalog(
      workspaceId,
      issuer.id,
      page,
      perPageRaw,
    );
  }

  @Delete(':workspaceId/installation')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async disconnectInstallation(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    await this.githubWorkspaceIntegration.disconnectInstallationForWorkspace(
      workspaceId,
      issuer.id,
    );
  }

  @Delete(':workspaceId/user')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async disconnectUser(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Auth() issuer: Issuer,
  ) {
    await this.githubWorkspaceIntegration.disconnectUserGitHubLink(
      workspaceId,
      issuer.id,
    );
  }
}
