import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { IssuerUserIsNotWorkspaceMember } from 'src/workspace/domain/exceptions';
import { Project } from 'src/project/domain/entities/project.entity';
import { WorkspaceRepository } from 'src/workspace/infrastructure/repositories';
import {
  GithubInstallationRepository,
  ProjectGithubRepoRepository,
} from '../repositories';
import { GithubApiService } from './github-api.service';
import { ProjectGithubRepo } from '../entities';

export type LinkedGithubRepoRow = {
  id: number;
  projectId: number;
  owner: string;
  name: string;
  fullName: string;
  githubRepoId: string;
  defaultBranch: string | null;
  isPrimary: boolean;
  createdAt: string;
};

@Injectable()
export class GithubProjectRepoLinkService {
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

  async listLinkedRepos(
    workspaceId: number,
    projectId: number,
    userId: number,
  ): Promise<LinkedGithubRepoRow[]> {
    await this.assertWorkspaceMember(workspaceId, userId);
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
      isPrimary: r.isPrimary,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async linkRepo(params: {
    workspaceId: number;
    projectId: number;
    userId: number;
    owner: string;
    name: string;
  }): Promise<LinkedGithubRepoRow> {
    const { workspaceId, projectId, userId, owner, name } = params;

    await this.assertWorkspaceMember(workspaceId, userId);
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
        owner,
        name,
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

    const existingCount = await this.projectGithubRepoRepo.count({
      where: { projectId },
    });

    const row = this.projectGithubRepoRepo.create({
      projectId,
      owner: details.owner,
      name: details.name,
      githubRepoId: details.githubRepoId,
      defaultBranch: details.defaultBranch,
      isPrimary: existingCount === 0,
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
        isPrimary: saved.isPrimary,
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

  async unlinkRepo(params: {
    workspaceId: number;
    projectId: number;
    linkId: number;
    userId: number;
  }): Promise<void> {
    const { workspaceId, projectId, linkId, userId } = params;

    await this.assertWorkspaceMember(workspaceId, userId);
    await this.assertProjectInWorkspace(projectId, workspaceId);

    const row = await this.projectGithubRepoRepo.findOne({
      where: { id: linkId, projectId },
    });
    if (!row) {
      throw new NotFoundException('Linked repository not found.');
    }

    const wasPrimary = row.isPrimary;

    await this.projectGithubRepoRepo.delete({ id: linkId });

    if (wasPrimary) {
      const next = await this.projectGithubRepoRepo.findOne({
        where: { projectId },
        order: { id: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.projectGithubRepoRepo.save(next);
      }
    }
  }

  async setPrimaryRepo(params: {
    workspaceId: number;
    projectId: number;
    linkId: number;
    userId: number;
  }): Promise<LinkedGithubRepoRow> {
    const { workspaceId, projectId, linkId, userId } = params;

    await this.assertWorkspaceMember(workspaceId, userId);
    await this.assertProjectInWorkspace(projectId, workspaceId);

    const target = await this.projectGithubRepoRepo.findOne({
      where: { id: linkId, projectId },
    });
    if (!target) {
      throw new NotFoundException('Linked repository not found.');
    }

    await this.projectGithubRepoRepo.manager.transaction(async (manager) => {
      await manager.update(
        ProjectGithubRepo,
        { projectId },
        { isPrimary: false },
      );
      await manager.update(
        ProjectGithubRepo,
        { id: linkId, projectId },
        { isPrimary: true },
      );
    });

    const refreshed = await this.projectGithubRepoRepo.findOne({
      where: { id: linkId },
    });
    if (!refreshed) {
      throw new NotFoundException('Linked repository not found.');
    }

    return {
      id: refreshed.id,
      projectId: refreshed.projectId,
      owner: refreshed.owner,
      name: refreshed.name,
      fullName: `${refreshed.owner}/${refreshed.name}`,
      githubRepoId: refreshed.githubRepoId,
      defaultBranch: refreshed.defaultBranch ?? null,
      isPrimary: refreshed.isPrimary,
      createdAt: refreshed.createdAt.toISOString(),
    };
  }
}
