import { Injectable } from '@nestjs/common';
import { GithubInstallationRepository } from '../repositories';
import { GithubInstallation, ProjectGithubRepo } from '../entities';

@Injectable()
export class GithubWorkspaceInstallationService {
  constructor(
    private readonly installationRepo: GithubInstallationRepository,
  ) {}

  /**
   * Removes the workspace GitHub App installation row and deletes all
   * `project_github_repos` links for projects in that workspace in one transaction.
   */
  async removeInstallationForWorkspace(workspaceId: number): Promise<void> {
    await this.installationRepo.manager.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .delete()
        .from(ProjectGithubRepo)
        .where(
          'project_id IN (SELECT id FROM workspace.workspace_project WHERE workspace_id = :wid)',
        )
        .setParameter('wid', workspaceId)
        .execute();
      await em.delete(GithubInstallation, { workspaceId });
    });
  }
}
