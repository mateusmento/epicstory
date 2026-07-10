import { Injectable } from '@nestjs/common';
import type { IGithubCatalogRepository } from '@epicstory/contracts';
import { AppConfig } from 'src/core/app.config';
import { signGithubAppJwt } from '../lib/github-app-jwt';
import {
  GithubHttpConfig,
  GithubWorkspaceRequestGate,
  githubHttpConfigFromApp,
  githubHttpFetch,
  githubRestJsonHeaders,
} from '../lib/github-http-client';
import { GithubCacheService } from './github-cache.service';

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

@Injectable()
export class GithubApiService {
  private readonly httpConfig: GithubHttpConfig;
  private readonly workspaceGate: GithubWorkspaceRequestGate;

  constructor(
    private readonly config: AppConfig,
    private readonly githubCache: GithubCacheService,
  ) {
    this.httpConfig = githubHttpConfigFromApp(config);
    this.workspaceGate = new GithubWorkspaceRequestGate(
      config.GITHUB_HTTP_MAX_CONCURRENT_REQUESTS_PER_WORKSPACE,
    );
  }

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
    const res = await githubHttpFetch({
      url,
      method: 'GET',
      headers: githubRestJsonHeaders(jwt),
      httpConfig: this.httpConfig,
    });

    if (!res.ok) {
      throw new Error(
        `GitHub installation fetch failed (${res.status}): ${res.bodyText}`,
      );
    }

    const body = JSON.parse(res.bodyText) as GithubInstallationRest;
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

  /**
   * Uninstalls a GitHub App installation (app JWT). Best-effort for workspace purge.
   * @see https://docs.github.com/en/rest/apps/apps#delete-an-installation-for-the-authenticated-app
   */
  async uninstallInstallation(installationId: string): Promise<void> {
    const jwt = this.requireAppJwt();
    const url = `https://api.github.com/app/installations/${installationId}`;
    const res = await githubHttpFetch({
      url,
      method: 'DELETE',
      headers: githubRestJsonHeaders(jwt),
      httpConfig: this.httpConfig,
    });

    if (res.status === 404) return;
    if (!res.ok) {
      throw new Error(
        `GitHub installation uninstall failed (${res.status}): ${res.bodyText}`,
      );
    }
  }

  /** Cached installation access token (re-mints before GitHub expiry per skew). */
  async getInstallationAccessToken(installationId: string): Promise<string> {
    const skewMs =
      Math.max(0, this.config.GITHUB_INSTALLATION_TOKEN_REFRESH_SKEW_SEC) *
      1000;
    const cached = await this.githubCache.getInstallationToken(installationId);
    if (cached && Date.now() < cached.expiresAtMs - skewMs) {
      return cached.token;
    }

    return this.mintAndCacheInstallationAccessToken(installationId);
  }

  /** @deprecated Prefer {@link getInstallationAccessToken} (cached). */
  async createInstallationAccessToken(installationId: string): Promise<string> {
    return this.getInstallationAccessToken(installationId);
  }

  async invalidateInstallationAccessToken(
    installationId: string,
  ): Promise<void> {
    await this.githubCache.deleteInstallationToken(installationId);
  }

  private async mintAndCacheInstallationAccessToken(
    installationId: string,
  ): Promise<string> {
    const jwt = this.requireAppJwt();
    const res = await githubHttpFetch({
      url: `https://api.github.com/app/installations/${installationId}/access_tokens`,
      method: 'POST',
      headers: githubRestJsonHeaders(jwt),
      httpConfig: this.httpConfig,
    });

    if (!res.ok) {
      throw new Error(
        `GitHub installation token failed (${res.status}): ${res.bodyText}`,
      );
    }

    const body = JSON.parse(res.bodyText) as GithubInstallationTokenResponse;
    const token = body.token?.trim();
    if (!token) throw new Error('GitHub did not return an installation token');

    const expiresAt =
      body.expires_at != null ? new Date(body.expires_at) : null;
    const expiresAtMs =
      expiresAt != null && !Number.isNaN(expiresAt.getTime())
        ? expiresAt.getTime()
        : Date.now() + 55 * 60 * 1000;

    const ttlSec = Math.max(
      60,
      Math.floor((expiresAtMs - Date.now()) / 1000) -
        this.config.GITHUB_INSTALLATION_TOKEN_REFRESH_SKEW_SEC,
    );

    await this.githubCache.setInstallationToken(
      installationId,
      { token, expiresAtMs },
      ttlSec,
    );

    return token;
  }

  private async installationAuthedFetch(params: {
    installationId: string;
    url: string;
    method?: 'GET' | 'POST';
    workspaceId?: number;
  }): Promise<{ ok: boolean; status: number; bodyText: string }> {
    const run = async (token: string) =>
      githubHttpFetch({
        url: params.url,
        method: params.method ?? 'GET',
        headers: githubRestJsonHeaders(token),
        httpConfig: this.httpConfig,
      });

    return this.workspaceGate.run(params.workspaceId, async () => {
      let token = await this.getInstallationAccessToken(params.installationId);
      let res = await run(token);

      if (
        res.status === 401 &&
        this.config.GITHUB_INSTALLATION_TOKEN_RETRY_REQUEST_ON_401
      ) {
        await this.githubCache.deleteInstallationToken(params.installationId);
        token = await this.mintAndCacheInstallationAccessToken(
          params.installationId,
        );
        res = await run(token);
      }

      return res;
    });
  }

  /**
   * One page of repos visible to the GitHub App installation (workspace catalogue).
   */
  async listInstallationRepositoriesPage(
    installationId: string,
    page: number,
    perPage: number,
    workspaceId?: number,
  ): Promise<{
    total: number;
    content: IGithubCatalogRepository[];
  }> {
    const cached = await this.githubCache.getRepoListPage(
      installationId,
      page,
      perPage,
    );
    if (cached) {
      return {
        total: cached.total,
        content: cached.content,
      };
    }

    const u = new URL('https://api.github.com/installation/repositories');
    u.searchParams.set('page', String(page));
    u.searchParams.set('per_page', String(perPage));

    const res = await this.installationAuthedFetch({
      installationId,
      url: u.toString(),
      method: 'GET',
      workspaceId,
    });

    if (!res.ok) {
      throw new Error(
        `GitHub installation repositories failed (${res.status}): ${res.bodyText}`,
      );
    }

    const body = JSON.parse(res.bodyText) as GithubInstallationReposRest;
    const raw = body.repositories ?? [];
    const totalCount =
      typeof body.total_count === 'number' ? body.total_count : raw.length;

    const repositories: IGithubCatalogRepository[] = raw.map((r) => ({
      githubRepoId: String(r.id),
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login ?? r.full_name.split('/')[0] ?? '',
      defaultBranch: r.default_branch ?? null,
      private: Boolean(r.private),
      htmlUrl: r.html_url ?? '',
    }));

    const pagePayload = { total: totalCount, content: repositories };
    await this.githubCache.setRepoListPage(
      installationId,
      page,
      perPage,
      pagePayload,
    );

    return pagePayload;
  }

  /**
   * Resolves a single repo using the installation token (verifies the app can access it).
   */
  async fetchRepositoryDetails(
    installationId: string,
    owner: string,
    name: string,
    workspaceId?: number,
  ): Promise<GithubRepoDetailsForLink | null> {
    const cached = await this.githubCache.getRepoMetadata(
      installationId,
      owner,
      name,
    );
    if (cached) {
      return {
        githubRepoId: cached.githubRepoId,
        owner: cached.owner,
        name: cached.name,
        fullName: cached.fullName,
        defaultBranch: cached.defaultBranch,
      };
    }

    const o = encodeURIComponent(owner.trim());
    const n = encodeURIComponent(name.trim());
    const url = `https://api.github.com/repos/${o}/${n}`;

    const res = await this.installationAuthedFetch({
      installationId,
      url,
      method: 'GET',
      workspaceId,
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(
        `GitHub repository fetch failed (${res.status}): ${res.bodyText}`,
      );
    }

    const body = JSON.parse(res.bodyText) as GithubSingleRepoRest;
    const login = body.owner?.login?.trim();
    const repoName = body.name?.trim();
    if (!login || !repoName) {
      throw new Error('GitHub returned an unexpected repository payload.');
    }

    const details: GithubRepoDetailsForLink = {
      githubRepoId: String(body.id),
      owner: login,
      name: repoName,
      fullName: body.full_name,
      defaultBranch: body.default_branch ?? null,
    };

    await this.githubCache.setRepoMetadata(installationId, owner, name, {
      githubRepoId: details.githubRepoId,
      owner: details.owner,
      name: details.name,
      fullName: details.fullName,
      defaultBranch: details.defaultBranch,
    });

    return details;
  }

  /**
   * Single pull request (same JSON shape as webhook `pull_request` payloads).
   */
  async fetchPullRequestWithInstallationToken(
    installationAccessToken: string,
    owner: string,
    name: string,
    pullNumber: number,
  ): Promise<Record<string, unknown> | null> {
    const o = encodeURIComponent(owner.trim());
    const n = encodeURIComponent(name.trim());
    const url = `https://api.github.com/repos/${o}/${n}/pulls/${pullNumber}`;

    const res = await githubHttpFetch({
      url,
      method: 'GET',
      headers: githubRestJsonHeaders(installationAccessToken),
      httpConfig: this.httpConfig,
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(
        `GitHub GET pull failed (${res.status}): ${res.bodyText}`,
      );
    }

    return JSON.parse(res.bodyText) as Record<string, unknown>;
  }

  /** PR reconcile: uses cached token + installation authed fetch (401 re-mint). */
  async fetchPullRequestForInstallation(
    installationId: string,
    owner: string,
    name: string,
    pullNumber: number,
    workspaceId?: number,
  ): Promise<Record<string, unknown> | null> {
    const o = encodeURIComponent(owner.trim());
    const n = encodeURIComponent(name.trim());
    const url = `https://api.github.com/repos/${o}/${n}/pulls/${pullNumber}`;

    const res = await this.installationAuthedFetch({
      installationId,
      url,
      method: 'GET',
      workspaceId,
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new Error(
        `GitHub GET pull failed (${res.status}): ${res.bodyText}`,
      );
    }

    return JSON.parse(res.bodyText) as Record<string, unknown>;
  }
}
