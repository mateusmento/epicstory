import { Injectable } from '@nestjs/common';
import { AppConfig } from 'src/core/app.config';

type LinearTokenResponse = {
  access_token: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  refresh_token?: string;
};

@Injectable()
export class LinearOAuthService {
  constructor(private config: AppConfig) {}

  getAuthorizeUrl(params: {
    state: string;
    scope?: string;
    promptConsent?: boolean;
  }) {
    const url = new URL('https://linear.app/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.LINEAR_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.config.LINEAR_CALLBACK_URI);
    url.searchParams.set('state', params.state);
    url.searchParams.set('scope', params.scope ?? 'read');
    // Always show Linear's consent UI so reconnect isn't silent after a prior grant.
    if (params.promptConsent !== false) {
      url.searchParams.set('prompt', 'consent');
    }
    return url.toString();
  }

  async exchangeCodeForToken(code: string): Promise<LinearTokenResponse> {
    const tokenUrl = 'https://api.linear.app/oauth/token';
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('client_id', this.config.LINEAR_CLIENT_ID);
    body.set('client_secret', this.config.LINEAR_CLIENT_SECRET);
    body.set('redirect_uri', this.config.LINEAR_CALLBACK_URI);
    body.set('code', code);

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Linear token exchange failed (${res.status}): ${text}`);
    }

    return (await res.json()) as LinearTokenResponse;
  }

  /**
   * Exchange a refresh token for a new access + refresh pair.
   * Linear rotates refresh tokens — always persist the returned refresh_token.
   * @see https://linear.app/developers/oauth-2-0-authentication
   */
  async refreshAccessToken(refreshToken: string): Promise<LinearTokenResponse> {
    const clientId = this.config.LINEAR_CLIENT_ID?.trim();
    const clientSecret = this.config.LINEAR_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error('Linear OAuth client is not configured');
    }

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    body.set('client_id', clientId);
    body.set('client_secret', clientSecret);

    const res = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Linear token refresh failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as LinearTokenResponse & {
      error?: string;
      error_description?: string;
    };
    if (data.error) {
      throw new Error(data.error_description || data.error);
    }
    return data;
  }

  /** Best-effort revoke so Linear drops the grant (disconnect shouldn't leave a silent reconnect). */
  async revokeToken(
    token: string,
    tokenTypeHint?: 'access_token' | 'refresh_token',
  ): Promise<void> {
    const body = new URLSearchParams();
    body.set('token', token);
    if (tokenTypeHint) body.set('token_type_hint', tokenTypeHint);

    const res = await fetch('https://api.linear.app/oauth/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    // 200 revoked; 400 already revoked — both fine for disconnect.
    if (!res.ok && res.status !== 400) {
      const text = await res.text().catch(() => '');
      throw new Error(`Linear token revoke failed (${res.status}): ${text}`);
    }
  }
}
