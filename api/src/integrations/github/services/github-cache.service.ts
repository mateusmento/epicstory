import { Injectable, Logger } from '@nestjs/common';
import type { IGithubCatalogRepository } from '@epicstory/contracts';
import { AppConfig } from 'src/core/app.config';
import { RedisService } from 'src/core/redis.service';
type CachedInstallationToken = {
  token: string;
  expiresAtMs: number;
};

type CachedRepoListPage = {
  total: number;
  content: IGithubCatalogRepository[];
};

@Injectable()
export class GithubCacheService {
  private readonly logger = new Logger(GithubCacheService.name);

  private readonly memoryInstallTokens = new Map<
    string,
    CachedInstallationToken
  >();
  private readonly memoryRepoList = new Map<string, CachedRepoListPage>();
  private readonly memoryRepoMeta = new Map<
    string,
    {
      githubRepoId: string;
      owner: string;
      name: string;
      fullName: string;
      defaultBranch: string | null;
    }
  >();

  constructor(
    private readonly config: AppConfig,
    private readonly redis: RedisService,
  ) {}

  private prefix(): string {
    const p = this.config.GITHUB_CACHE_KEY_PREFIX?.trim() || 'github:';
    return p.endsWith(':') ? p : `${p}:`;
  }

  private useRedis(): boolean {
    return Boolean(this.config.GITHUB_CACHE_USE_REDIS);
  }

  private installTokenKey(installationId: string): string {
    return `${this.prefix()}install-token:${installationId}`;
  }

  private repoListKey(
    installationId: string,
    page: number,
    perPage: number,
  ): string {
    return `${this.prefix()}repo-list:${installationId}:p${page}:pp${perPage}`;
  }

  private repoMetaKey(
    installationId: string,
    owner: string,
    name: string,
  ): string {
    return `${this.prefix()}repo-meta:${installationId}:${owner.trim().toLowerCase()}/${name.trim().toLowerCase()}`;
  }

  async getInstallationToken(
    installationId: string,
  ): Promise<CachedInstallationToken | null> {
    const key = this.installTokenKey(installationId);
    if (this.useRedis()) {
      try {
        const raw = await this.redis.client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as CachedInstallationToken;
      } catch (e) {
        this.logger.warn(
          `Redis get install token failed (${installationId}): ${e instanceof Error ? e.message : String(e)}`,
        );
        return this.memoryInstallTokens.get(installationId) ?? null;
      }
    }
    return this.memoryInstallTokens.get(installationId) ?? null;
  }

  async setInstallationToken(
    installationId: string,
    entry: CachedInstallationToken,
    ttlSec: number,
  ): Promise<void> {
    const key = this.installTokenKey(installationId);
    this.memoryInstallTokens.set(installationId, entry);
    if (!this.useRedis()) return;

    try {
      await this.redis.client.set(key, JSON.stringify(entry), { EX: ttlSec });
    } catch (e) {
      this.logger.warn(
        `Redis set install token failed (${installationId}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async deleteInstallationToken(installationId: string): Promise<void> {
    this.memoryInstallTokens.delete(installationId);
    if (!this.useRedis()) return;
    try {
      await this.redis.client.del(this.installTokenKey(installationId));
    } catch (e) {
      this.logger.warn(
        `Redis del install token failed (${installationId}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async getRepoListPage(
    installationId: string,
    page: number,
    perPage: number,
  ): Promise<CachedRepoListPage | null> {
    const key = this.repoListKey(installationId, page, perPage);
    if (this.useRedis()) {
      try {
        const raw = await this.redis.client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as CachedRepoListPage;
      } catch (e) {
        this.logger.warn(
          `Redis get repo list failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        return this.memoryRepoList.get(key) ?? null;
      }
    }
    return this.memoryRepoList.get(key) ?? null;
  }

  async setRepoListPage(
    installationId: string,
    page: number,
    perPage: number,
    value: CachedRepoListPage,
  ): Promise<void> {
    const key = this.repoListKey(installationId, page, perPage);
    this.memoryRepoList.set(key, value);
    if (!this.useRedis()) return;

    const ttl = Math.max(1, this.config.GITHUB_CACHE_REPO_LIST_TTL_SEC);
    try {
      await this.redis.client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (e) {
      this.logger.warn(
        `Redis set repo list failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async getRepoMetadata(
    installationId: string,
    owner: string,
    name: string,
  ): Promise<{
    githubRepoId: string;
    owner: string;
    name: string;
    fullName: string;
    defaultBranch: string | null;
  } | null> {
    const key = this.repoMetaKey(installationId, owner, name);
    if (this.useRedis()) {
      try {
        const raw = await this.redis.client.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as {
          githubRepoId: string;
          owner: string;
          name: string;
          fullName: string;
          defaultBranch: string | null;
        };
      } catch (e) {
        this.logger.warn(
          `Redis get repo meta failed: ${e instanceof Error ? e.message : String(e)}`,
        );
        return this.memoryRepoMeta.get(key) ?? null;
      }
    }
    return this.memoryRepoMeta.get(key) ?? null;
  }

  async setRepoMetadata(
    installationId: string,
    owner: string,
    name: string,
    value: {
      githubRepoId: string;
      owner: string;
      name: string;
      fullName: string;
      defaultBranch: string | null;
    },
  ): Promise<void> {
    const key = this.repoMetaKey(installationId, owner, name);
    this.memoryRepoMeta.set(key, value);
    if (!this.useRedis()) return;

    const ttl = Math.max(1, this.config.GITHUB_CACHE_REPO_METADATA_TTL_SEC);
    try {
      await this.redis.client.set(key, JSON.stringify(value), { EX: ttl });
    } catch (e) {
      this.logger.warn(
        `Redis set repo meta failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /** Drop installation token + catalogue/metadata keys for an installation. */
  async purgeInstallationCaches(installationId: string): Promise<void> {
    await this.deleteInstallationToken(installationId);

    const memPrefixList = `${this.prefix()}repo-list:${installationId}:`;
    const memPrefixMeta = `${this.prefix()}repo-meta:${installationId}:`;
    for (const key of [...this.memoryRepoList.keys()]) {
      if (key.startsWith(memPrefixList)) {
        this.memoryRepoList.delete(key);
      }
    }
    for (const key of [...this.memoryRepoMeta.keys()]) {
      if (key.startsWith(memPrefixMeta)) {
        this.memoryRepoMeta.delete(key);
      }
    }

    if (!this.useRedis()) return;

    const patterns = [
      `${this.prefix()}repo-list:${installationId}:*`,
      `${this.prefix()}repo-meta:${installationId}:*`,
    ];

    try {
      for (const pattern of patterns) {
        for await (const key of this.redis.client.scanIterator({
          MATCH: pattern,
          COUNT: 100,
        })) {
          await this.redis.client.del(key);
        }
      }
    } catch (e) {
      this.logger.warn(
        `Redis purge installation caches failed (${installationId}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  async purgeRepoMetadata(
    installationId: string,
    owner: string,
    name: string,
  ): Promise<void> {
    const key = this.repoMetaKey(installationId, owner, name);
    this.memoryRepoMeta.delete(key);
    if (!this.useRedis()) return;
    try {
      await this.redis.client.del(key);
    } catch (e) {
      this.logger.warn(
        `Redis del repo meta failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  shouldInvalidateOnAdminActions(): boolean {
    return this.config.GITHUB_CACHE_INVALIDATE_ON_ADMIN_ACTIONS;
  }

  shouldInvalidateOnRepoWebhooks(): boolean {
    return this.config.GITHUB_CACHE_INVALIDATE_ON_REPO_WEBHOOKS;
  }
}
