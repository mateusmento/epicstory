import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ExceptionFilter } from 'src/core';
import { JwtAuthGuard } from 'src/core/auth/jwt.strategy';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import { Auth, Issuer } from 'src/core/auth';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { Project } from 'src/project/domain/entities/project.entity';
import {
  GithubInstallationRepository,
  ProjectGithubRepoRepository,
} from '../repositories';
import { GithubApiService } from '../services/github-api.service';
import { LinkGithubRepoBodyDto } from '../dto/link-github-repo.dto';

@Controller('integrations/github/workspaces/:workspaceId/projects')
export class GithubProjectReposController {
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly installationRepo: GithubInstallationRepository,
    private readonly projectGithubRepoRepo: ProjectGithubRepoRepository,
    private readonly githubApi: GithubApiService,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  private async assertWorkspaceMember(workspaceId: number, userId: number) {
    const isMember = await this.workspaceRepo.memberExists(workspaceId, userId);
    if (!isMember) throw new IssuerUserIsNotWorkspaceMember();
  }

  private async assertProjectInWorkspace(
    projectId: number,
    workspaceId: number,
  ) {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException('Project not found in this workspace.');
    }
  }

  @Get(':projectId/repos')
  @UseGuards(JwtAuthGuard)
  @ExceptionFilter([IssuerUserIsNotWorkspaceMember, ForbiddenException])
  async listLinkedRepos(
    @Param('workspaceId', ParseIntPipe) workspaceId: number,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Auth() issuer: Issuer,
  ) {
    await this.assertWorkspaceMember(workspaceId, issuer.id);
    await this.assertProjectInWorkspace(projectId, workspaceId);

    const rows = await this.projectGithubRepoRepo.findByProjectId(projectId);
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      owner: r.owner,
      name: r.name,
      fullName: `${r.owner}/${r.name}`,
      githubRepoId: r.githubRepoId,
      defaultBranch: r.defaultBranch ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
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
    await this.assertWorkspaceMember(workspaceId, issuer.id);
    await this.assertProjectInWorkspace(projectId, workspaceId);

    const installation =
      await this.installationRepo.findByWorkspaceId(workspaceId);
    if (!installation) {
      throw new BadRequestException(
        'Workspace has no GitHub App installation yet.',
      );
    }

    let details;
    try {
      details = await this.githubApi.fetchRepositoryDetails(
        installation.githubInstallationId,
        body.owner,
        body.name,
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('GITHUB_APP_PRIVATE_KEY') && msg.includes('required')) {
        throw new BadRequestException(
          'Linking a repository requires GITHUB_APP_PRIVATE_KEY on the API.',
        );
      }
      throw new BadRequestException(msg);
    }

    if (!details) {
      throw new BadRequestException(
        'Repository not found or not accessible to this workspace installation.',
      );
    }

    const existing = await this.projectGithubRepoRepo.findOne({
      where: {
        projectId,
        owner: details.owner,
        name: details.name,
      },
    });
    if (existing) {
      throw new ConflictException(
        'This repository is already linked to this project.',
      );
    }

    const row = this.projectGithubRepoRepo.create({
      projectId,
      owner: details.owner,
      name: details.name,
      githubRepoId: details.githubRepoId,
      defaultBranch: details.defaultBranch,
    });

    try {
      const saved = await this.projectGithubRepoRepo.save(row);
      return {
        id: saved.id,
        projectId: saved.projectId,
        owner: saved.owner,
        name: saved.name,
        fullName: details.fullName,
        githubRepoId: saved.githubRepoId,
        defaultBranch: saved.defaultBranch ?? null,
        createdAt: saved.createdAt.toISOString(),
      };
    } catch (e: unknown) {
      const pgCode =
        e instanceof QueryFailedError
          ? (e as QueryFailedError & { driverError?: { code?: string } })
              .driverError?.code
          : undefined;
      if (pgCode === '23505') {
        throw new ConflictException(
          'This repository is already linked to this project.',
        );
      }
      throw e;
    }
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
    await this.assertWorkspaceMember(workspaceId, issuer.id);
    await this.assertProjectInWorkspace(projectId, workspaceId);

    const row = await this.projectGithubRepoRepo.findOne({
      where: { id: linkId, projectId },
    });
    if (!row) {
      throw new NotFoundException('Linked repository not found.');
    }

    await this.projectGithubRepoRepo.delete({ id: linkId });
  }
}
