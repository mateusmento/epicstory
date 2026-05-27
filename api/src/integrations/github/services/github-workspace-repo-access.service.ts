import { BadRequestException, Injectable } from '@nestjs/common';
import { GithubInstallationRepository } from '../repositories';
import { GithubApiService } from './github-api.service';

export type WorkspaceGithubRepoAccess = {
  owner: string;
  name: string;
  defaultBranch: string | null;
};

/**
 * Repos available to a workspace are those on the GitHub App installation catalogue
 * (live GitHub API), not per-project link rows.
 */
@Injectable()
export class GithubWorkspaceRepoAccessService {
  constructor(
    private readonly installations: GithubInstallationRepository,
    private readonly githubApi: GithubApiService,
  ) {}

  async assertRepositoryAccessible(
    workspaceId: number,
    owner: string,
    repoName: string,
  ): Promise<WorkspaceGithubRepoAccess> {
    const installation =
      await this.installations.findByWorkspaceId(workspaceId);
    if (!installation) {
      throw new BadRequestException(
        'This workspace does not have the GitHub App installed',
      );
    }

    const ownerTrim = owner.trim();
    const nameTrim = repoName.trim();
    const details = await this.githubApi.fetchRepositoryDetails(
      installation.githubInstallationId,
      ownerTrim,
      nameTrim,
      workspaceId,
    );
    if (!details) {
      throw new BadRequestException(
        'Repository is not available on this workspace GitHub installation',
      );
    }

    return {
      owner: ownerTrim,
      name: nameTrim,
      defaultBranch: details.defaultBranch?.trim()?.length
        ? details.defaultBranch.trim()
        : null,
    };
  }
}
