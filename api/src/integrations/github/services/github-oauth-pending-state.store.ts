import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';

export type InstallPendingPayload = {
  workspaceId: number;
  oauthRedirect?: string;
};

export type UserOAuthPendingPayload = {
  workspaceId: number;
  userId: number;
  oauthRedirect?: string;
};

type Wrapped =
  | { kind: 'install'; expiresAtMs: number; data: InstallPendingPayload }
  | { kind: 'user'; expiresAtMs: number; data: UserOAuthPendingPayload };

/**
 * Short-lived OAuth / install correlation keyed by opaque `state` values.
 *
 * Avoids reliance on cookies: GitHub’s redirect URL host may differ from the host
 * that served `/install/start`, so host-only cookies are often missing → "Invalid OAuth state".
 *
 * Single-process memory only; use Redis when running multiple API instances.
 */
@Injectable()
export class GithubOAuthPendingStateStore {
  private readonly pending = new Map<string, Wrapped>();

  private readonly ttlMs = 15 * 60 * 1000;

  allocateInstallationState(params: InstallPendingPayload): string {
    this.pruneExpired();
    const state = randomBytes(16).toString('hex');
    this.pending.set(state, {
      kind: 'install',
      expiresAtMs: Date.now() + this.ttlMs,
      data: params,
    });
    return state;
  }

  consumeInstallationState(
    state: string | undefined,
  ): InstallPendingPayload | null {
    this.pruneExpired();
    if (!state?.trim()) return null;
    const key = state.trim();
    const row = this.pending.get(key);
    if (!row || row.kind !== 'install') return null;
    this.pending.delete(key);
    if (Date.now() > row.expiresAtMs) return null;
    return row.data;
  }

  allocateUserOAuthState(data: UserOAuthPendingPayload): string {
    this.pruneExpired();
    const state = randomBytes(16).toString('hex');
    this.pending.set(state, {
      kind: 'user',
      expiresAtMs: Date.now() + this.ttlMs,
      data,
    });
    return state;
  }

  consumeUserOAuthState(
    state: string | undefined,
  ): UserOAuthPendingPayload | null {
    this.pruneExpired();
    if (!state?.trim()) return null;
    const key = state.trim();
    const row = this.pending.get(key);
    if (!row || row.kind !== 'user') return null;
    this.pending.delete(key);
    if (Date.now() > row.expiresAtMs) return null;
    return row.data;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, row] of this.pending.entries()) {
      if (row.expiresAtMs < now) {
        this.pending.delete(key);
      }
    }
  }
}
