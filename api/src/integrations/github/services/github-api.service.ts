import { Injectable } from '@nestjs/common';
import { AppConfig } from 'src/core/app.config';
import { signGithubAppJwt } from '../lib/github-app-jwt';

type GithubInstallationRest = {
  id: number;
  account?: { login?: string; type?: string };
  suspended_at?: string | null;
};

type GithubInstallationTokenResponse = {
  token?: string;
  expires_at?: string;
};

type GithubRepoRest = {
  id: number;
  name: string;
  full_name: string;
  private?: boolean;
  default_branch?: string | null;
  html_url?: string;
  owner?: { login?: string };
};

type GithubInstallationReposRest = {
  total_count?: number;
  repositories?: GithubRepoRest[];
};

type GithubSingleRepoRest = {
  id: number;
  name: string;
  full_name: string;
  default_branch?: string | null;
  owner?: { login?: string };
};

export type GithubRepoDetailsForLink = {
  githubRepoId: string;
  /** Canonical owner login from GitHub. */
  owner: string;
  /** Repository name from GitHub. */
  name: string;
  fullName: string;
  defaultBranch: string | null;
};

export type GithubCatalogRepo = {
  githubRepoId: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string | null;
  private: boolean;
  htmlUrl: string;
};

@Injectable()
export class GithubApiService {
  constructor(private readonly config: AppConfig) {}

  private requireAppJwt(): string {
    const appId = this.config.GITHUB_APP_ID;
    const pk = this.config.GITHUB_APP_PRIVATE_KEY?.trim();
    if (!appId || !pk) {
      throw new Error(
        'GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY are required for this operation',
      );
    }
    return signGithubAppJwt(appId, pk);
  }

  /**
   * Fetches installation metadata using an app JWT (requires private key).
   */
  async fetchInstallationAccount(installationId: string): Promise<{
    accountLogin: string;
    accountType: string;
    suspendedAt: Date | null;
  }> {
    const jwt = this.requireAppJwt();
    const url = `https://api.github.com/app/installations/${installationId}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `GitHub installation fetch failed (${res.status}): ${text}`,
      );
    }

    const body = (await res.json()) as GithubInstallationRest;
    const login = body.account?.login?.trim();
    const accountType = body.account?.type?.trim();
    const suspendedAt =
      body.suspended_at != null ? new Date(body.suspended_at) : null;

    return {
      accountLogin: login || 'unknown',
      accountType: accountType || 'Unknown',
      suspendedAt,
    };
  }

  async createInstallationAccessToken(installationId: string): Promise<string> {
    const jwt = this.requireAppJwt();
    const res = await fetch(
      `https://api.github.com/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `GitHub installation token failed (${res.status}): ${text}`,
      );
    }

    const body = (await res.json()) as GithubInstallationTokenResponse;
    const token = body.token?.trim();
    if (!token) throw new Error('GitHub did not return an installation token');
    return token;
  }

  /**
   * One page of repos visible to the GitHub App installation (workspace catalogue).
   */
  async listInstallationRepositoriesPage(
    installationId: string,
    page: number,
    perPage: number,
  ): Promise<{
    totalCount: number;
    repositories: GithubCatalogRepo[];
  }> {
    const installationToken =
      await this.createInstallationAccessToken(installationId);
    const u = new URL('https://api.github.com/installation/repositories');
    u.searchParams.set('page', String(page));
    u.searchParams.set('per_page', String(perPage));

    const res = await fetch(u.toString(), {
      headers: {
        Authorization: `Bearer ${installationToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `GitHub installation repositories failed (${res.status}): ${text}`,
      );
    }

    const body = (await res.json()) as GithubInstallationReposRest;
    const raw = body.repositories ?? [];
    const totalCount =
      typeof body.total_count === 'number' ? body.total_count : raw.length;

    const repositories: GithubCatalogRepo[] = raw.map((r) => ({
      githubRepoId: String(r.id),
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login ?? r.full_name.split('/')[0] ?? '',
      defaultBranch: r.default_branch ?? null,
      private: Boolean(r.private),
      htmlUrl: r.html_url ?? '',
    }));

    return { totalCount, repositories };
  }

  /**
   * Resolves a single repo using the installation token (verifies the app can access it).
   */
  async fetchRepositoryDetails(
    installationId: string,
    owner: string,
    name: string,
  ): Promise<GithubRepoDetailsForLink | null> {
    const installationToken =
      await this.createInstallationAccessToken(installationId);
    const o = encodeURIComponent(owner.trim());
    const n = encodeURIComponent(name.trim());
    const url = `https://api.github.com/repos/${o}/${n}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${installationToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `GitHub repository fetch failed (${res.status}): ${text}`,
      );
    }

    const body = (await res.json()) as GithubSingleRepoRest;
    const login = body.owner?.login?.trim();
    const repoName = body.name?.trim();
    if (!login || !repoName) {
      throw new Error('GitHub returned an unexpected repository payload.');
    }

    return {
      githubRepoId: String(body.id),
      owner: login,
      name: repoName,
      fullName: body.full_name,
      defaultBranch: body.default_branch ?? null,
    };
  }
}
