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

  getAuthorizeUrl(params: { state: string; scope?: string }) {
    const url = new URL('https://linear.app/oauth/authorize');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('client_id', this.config.LINEAR_CLIENT_ID);
    url.searchParams.set('redirect_uri', this.config.LINEAR_CALLBACK_URI);
    url.searchParams.set('state', params.state);
    url.searchParams.set('scope', params.scope ?? 'read');
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
}
