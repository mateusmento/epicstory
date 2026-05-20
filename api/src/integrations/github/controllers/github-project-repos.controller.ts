import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { LinkGithubRepoBodyDto } from '../dto/link-github-repo.dto';
import { GithubProjectRepoLinkService } from '../services';

@Controller('integrations/github/workspaces/:workspaceId/projects')
export class GithubProjectReposController {
  constructor(
    private readonly projectRepoLinks: GithubProjectRepoLinkService,
  ) {}

  @Get(':projectId/repos')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listLinkedRepos(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.projectRepoLinks.listLinkedRepos(
      workspaceId,
      projectId,
      issuer.id,
    );
  }

  @Post(':projectId/repos')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async linkRepo(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() body: LinkGithubRepoBodyDto,
    @Auth() issuer: Issuer,
  ) {
    return this.projectRepoLinks.linkRepo({
      workspaceId,
      projectId,
      userId: issuer.id,
      owner: body.owner,
      name: body.name,
    });
  }

  @Post(':projectId/repos/:linkId/primary')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async setPrimaryRepo(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
    @Auth() issuer: Issuer,
  ) {
    return this.projectRepoLinks.setPrimaryRepo({
      workspaceId,
      projectId,
      linkId,
      userId: issuer.id,
    });
  }

  @Delete(':projectId/repos/:linkId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async unlinkRepo(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('linkId', ParseIntPipe) linkId: number,
    @Auth() issuer: Issuer,
  ) {
    await this.projectRepoLinks.unlinkRepo({
      workspaceId,
      projectId,
      linkId,
      userId: issuer.id,
    });
  }
}
