import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { AppConfig } from 'src/core/app.config';
import { RedisService } from 'src/core/redis.service';

export type InstallPendingPayload = {
  workspaceId: number;
  /** Epicstory user who started the install (receives automatic member OAuth after install). */
  installerUserId: number;
  oauthRedirect?: string;
};

export type UserOAuthPendingPayload = {
  workspaceId: number;
  userId: number;
  oauthRedirect?: string;
  /** RFC 7636 PKCE verifier paired with `code_challenge` on authorize. */
  codeVerifier: string;
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
 * Uses Redis when `GITHUB_CACHE_USE_REDIS` is enabled (shared across API instances).
 */
@Injectable()
export class GithubOAuthPendingStateStore {
  private readonly logger = new Logger(GithubOAuthPendingStateStore.name);
  private readonly memory = new Map<string, Wrapped>();
  private readonly ttlMs = 15 * 60 * 1000;

  constructor(
    private readonly config: AppConfig,
    private readonly redis: RedisService,
  ) {}

  private useRedis(): boolean {
    return Boolean(this.config.GITHUB_CACHE_USE_REDIS);
  }

  private redisKey(state: string): string {
    const prefix = this.config.GITHUB_CACHE_KEY_PREFIX?.trim() || 'github:';
    const base = prefix.endsWith(':') ? prefix : `${prefix}:`;
    return `${base}oauth-pending:${state}`;
  }

  private persist(state: string, row: Wrapped): void {
    this.memory.set(state, row);
    if (!this.useRedis()) return;
    const ttlSec = Math.ceil(this.ttlMs / 1000);
    this.redis.client
      .set(this.redisKey(state), JSON.stringify(row), { EX: ttlSec })
      .catch((e) => {
        this.logger.warn(
          `Redis set oauth pending failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
  }

  private async load(state: string): Promise<Wrapped | null> {
    const key = state.trim();
    if (!key) return null;

    if (this.useRedis()) {
      try {
        const raw = await this.redis.client.get(this.redisKey(key));
        if (raw) {
          const parsed = JSON.parse(raw) as Wrapped;
          this.memory.set(key, parsed);
          return parsed;
        }
      } catch (e) {
        this.logger.warn(
          `Redis get oauth pending failed: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    return this.memory.get(key) ?? null;
  }

  private async remove(state: string): Promise<void> {
    const key = state.trim();
    this.memory.delete(key);
    if (!this.useRedis()) return;
    try {
      await this.redis.client.del(this.redisKey(key));
    } catch (e) {
      this.logger.warn(
        `Redis del oauth pending failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  allocateInstallationState(params: InstallPendingPayload): string {
    this.pruneExpiredMemory();
    const state = randomBytes(16).toString('hex');
    const row: Wrapped = {
      kind: 'install',
      expiresAtMs: Date.now() + this.ttlMs,
      data: params,
    };
    this.persist(state, row);
    return state;
  }

  async consumeInstallationState(
    state: string | undefined,
  ): Promise<InstallPendingPayload | null> {
    this.pruneExpiredMemory();
    if (!state?.trim()) return null;
    const key = state.trim();
    const row = await this.load(key);
    if (!row || row.kind !== 'install') return null;
    await this.remove(key);
    if (Date.now() > row.expiresAtMs) return null;
    return row.data;
  }

  allocateUserOAuthState(data: UserOAuthPendingPayload): string {
    this.pruneExpiredMemory();
    const state = randomBytes(16).toString('hex');
    const row: Wrapped = {
      kind: 'user',
      expiresAtMs: Date.now() + this.ttlMs,
      data,
    };
    this.persist(state, row);
    return state;
  }

  async consumeUserOAuthState(
    state: string | undefined,
  ): Promise<UserOAuthPendingPayload | null> {
    this.pruneExpiredMemory();
    if (!state?.trim()) return null;
    const key = state.trim();
    const row = await this.load(key);
    if (!row || row.kind !== 'user') return null;
    await this.remove(key);
    if (Date.now() > row.expiresAtMs) return null;
    return row.data;
  }

  private pruneExpiredMemory(): void {
    const now = Date.now();
    for (const [key, row] of this.memory.entries()) {
      if (row.expiresAtMs < now) {
        this.memory.delete(key);
      }
    }
  }
}
