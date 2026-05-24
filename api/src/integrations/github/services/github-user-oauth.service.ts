import { Injectable } from '@nestjs/common';
import { AppConfig } from 'src/core/app.config';
import { createGithubOAuthCodeChallenge } from '../lib/github-oauth-pkce';

type GithubUserTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
};

type GithubUserRest = {
  id: number;
  login: string;
};

@Injectable()
export class GithubUserOAuthService {
  constructor(private readonly config: AppConfig) {}

  getUserAuthorizeUrl(state: string, codeVerifier: string): string {
    const clientId = this.config.GITHUB_APP_CLIENT_ID?.trim();
    if (!clientId) throw new Error('GITHUB_APP_CLIENT_ID is not configured');

    const redirectUri = this.config.getGithubUserCallbackUrl();
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set(
      'code_challenge',
      createGithubOAuthCodeChallenge(codeVerifier),
    );
    url.searchParams.set('code_challenge_method', 'S256');
    return url.toString();
  }

  getNewInstallationUrl(state: string): string {
    const slug = this.config.GITHUB_APP_SLUG?.trim();
    if (!slug) throw new Error('GITHUB_APP_SLUG is not configured');

    const url = new URL(`https://github.com/apps/${slug}/installations/new`);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
  ): Promise<GithubUserTokenResponse> {
    const clientId = this.config.GITHUB_APP_CLIENT_ID?.trim();
    const clientSecret = this.config.GITHUB_APP_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth client is not configured');
    }

    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('code', code);
    body.set('redirect_uri', this.config.getGithubUserCallbackUrl());
    body.set('code_verifier', codeVerifier);

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub token exchange failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as GithubUserTokenResponse & {
      error?: string;
      error_description?: string;
    };
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }
    return data;
  }

  /**
   * Refresh user-to-server access token when GitHub issued a refresh_token.
   * @see https://docs.github.com/en/apps/using-github-apps/refreshing-user-access-tokens
   */
  async refreshUserAccessToken(
    refreshToken: string,
  ): Promise<GithubUserTokenResponse> {
    const clientId = this.config.GITHUB_APP_CLIENT_ID?.trim();
    const clientSecret = this.config.GITHUB_APP_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error('GitHub OAuth client is not configured');
    }

    const body = new URLSearchParams();
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub token refresh failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as GithubUserTokenResponse & {
      error?: string;
      error_description?: string;
    };
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }
    return data;
  }

  async fetchGithubUser(accessToken: string): Promise<{
    id: string;
    login: string;
  }> {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub user fetch failed (${res.status}): ${text}`);
    }

    const body = (await res.json()) as GithubUserRest;
    return {
      id: String(body.id),
      login: body.login,
    };
  }
}
