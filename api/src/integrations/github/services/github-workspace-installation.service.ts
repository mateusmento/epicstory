import { Injectable } from '@nestjs/common';
import { GithubInstallationRepository } from '../repositories';
import { GithubInstallation } from '../entities';

@Injectable()
export class GithubWorkspaceInstallationService {
  constructor(
    private readonly installationRepo: GithubInstallationRepository,
  ) {}

  /** Removes the workspace GitHub App installation row. */
  async removeInstallationForWorkspace(workspaceId: number): Promise<void> {
    await this.installationRepo.manager.delete(GithubInstallation, {
      workspaceId,
    });
  }
}
