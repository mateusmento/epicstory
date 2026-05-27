import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  candidateIssueKeyPrefixFromProjectName,
  disambiguateIssueKeyPrefix,
  formatIssueKey,
  normalizeProjectKeyPrefix,
} from 'src/project/domain/issue-key';
import { Project } from 'src/project/domain/entities/project.entity';

@Injectable()
export class IssueKeyAllocationService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  /**
   * Suggest a unique project key prefix for a workspace, based on a name.
   * Used by the UI to show the final (disambiguated) suggestion.
   */
  async suggestUniquePrefix(params: {
    workspaceId: number;
    projectName: string;
  }): Promise<string> {
    const taken = await this.takenPrefixesInWorkspace(params.workspaceId);
    const base = candidateIssueKeyPrefixFromProjectName(params.projectName);
    return disambiguateIssueKeyPrefix(base, taken, {
      compactName: params.projectName,
    });
  }

  async resolvePrefixForNewProject(params: {
    workspaceId: number;
    projectName: string;
    customPrefix?: string | null;
  }): Promise<string> {
    const taken = await this.takenPrefixesInWorkspace(params.workspaceId);

    const custom = params.customPrefix?.trim();
    if (custom) {
      const normalized = normalizeProjectKeyPrefix(custom);
      if (!normalized) {
        throw new BadRequestException(
          'Project key must be 2–10 characters, start with a letter, and use only letters and numbers.',
        );
      }
      if (taken.has(normalized)) {
        throw new ConflictException(
          `Project key "${normalized}" is already used in this workspace.`,
        );
      }
      return normalized;
    }

    const base = candidateIssueKeyPrefixFromProjectName(params.projectName);
    return disambiguateIssueKeyPrefix(base, taken, {
      compactName: params.projectName,
    });
  }

  private async takenPrefixesInWorkspace(
    workspaceId: number,
  ): Promise<Set<string>> {
    const rows = await this.projectRepo.find({
      where: { workspaceId },
      select: { issueKeyPrefix: true },
    });
    return new Set(
      rows
        .map((r) => r.issueKeyPrefix?.toUpperCase())
        .filter(Boolean) as string[],
    );
  }

  /**
   * Reserves the next issue number for a project (row lock) and returns key parts.
   */
  async allocateIssueKey(projectId: number): Promise<{
    issueNumber: number;
    issueKey: string;
    issueKeyPrefix: string;
  }> {
    return this.projectRepo.manager.transaction(async (em) => {
      const project = await em
        .getRepository(Project)
        .createQueryBuilder('p')
        .setLock('pessimistic_write')
        .where('p.id = :projectId', { projectId })
        .getOne();

      if (!project?.issueKeyPrefix) {
        throw new Error(`Project ${projectId} has no issue key prefix`);
      }

      const issueNumber = project.nextIssueNumber;
      const next = issueNumber + 1;
      await em.update(Project, { id: projectId }, { nextIssueNumber: next });

      const issueKey = formatIssueKey(project.issueKeyPrefix, issueNumber);
      return {
        issueNumber,
        issueKey,
        issueKeyPrefix: project.issueKeyPrefix,
      };
    });
  }
}
