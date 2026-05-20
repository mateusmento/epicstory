import { Injectable } from '@nestjs/common';
import { AppConfig } from 'src/core/app.config';
import { signGithubAppJwt } from '../lib/github-app-jwt';

type GithubInstallationRest = {
  id: number;
  account?: { login?: string; type?: string };
  suspended_at?: string | null;
};

@Injectable()
export class GithubApiService {
  constructor(private readonly config: AppConfig) {}

  /**
   * Fetches installation metadata using an app JWT (requires private key).
   */
  async fetchInstallationAccount(
    installationId: string,
  ): Promise<{
    accountLogin: string;
    accountType: string;
    suspendedAt: Date | null;
  }> {
    const appId = this.config.GITHUB_APP_ID;
    const pk = this.config.GITHUB_APP_PRIVATE_KEY?.trim();
    if (!appId || !pk) {
      throw new Error(
        'GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY required to sync installation',
      );
    }

    const jwt = signGithubAppJwt(appId, pk);
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
}
