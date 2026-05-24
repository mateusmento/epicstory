import type { AppConfig } from 'src/core/app.config';

const GH_ACCEPT = 'application/vnd.github+json';
const GH_VER = '2022-11-28';

export type GithubHttpConfig = {
  timeoutMs: number;
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: number;
};

export function githubHttpConfigFromApp(config: AppConfig): GithubHttpConfig {
  return {
    timeoutMs: Math.max(1000, config.GITHUB_HTTP_TIMEOUT_MS),
    maxAttempts: Math.max(1, config.GITHUB_HTTP_RETRY_MAX_ATTEMPTS),
    initialDelayMs: Math.max(0, config.GITHUB_HTTP_RETRY_INITIAL_DELAY_MS),
    maxDelayMs: Math.max(0, config.GITHUB_HTTP_RETRY_MAX_DELAY_MS),
    backoffMultiplier: Math.max(1, config.GITHUB_HTTP_RETRY_BACKOFF_MULTIPLIER),
    jitter: Math.min(1, Math.max(0, config.GITHUB_HTTP_RETRY_JITTER)),
  };
}

export const githubRestJsonHeaders = (
  authorization: string,
  extra?: Record<string, string>,
): Record<string, string> => ({
  Authorization: `Bearer ${authorization}`,
  Accept: GH_ACCEPT,
  'X-GitHub-Api-Version': GH_VER,
  ...extra,
});

export type GithubHttpFetchResult = {
  ok: boolean;
  status: number;
  bodyText: string;
};

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

function retryDelayMs(params: {
  attempt: number;
  retryAfterHeader: string | null;
  httpConfig: GithubHttpConfig;
}): number {
  const { attempt, retryAfterHeader, httpConfig } = params;
  const retrySeconds =
    retryAfterHeader != null ? Number(retryAfterHeader) : NaN;
  if (Number.isFinite(retrySeconds) && retrySeconds > 0) {
    return retrySeconds * 1000;
  }
  const base =
    httpConfig.initialDelayMs * Math.pow(httpConfig.backoffMultiplier, attempt);
  const capped = Math.min(httpConfig.maxDelayMs, base);
  const jitterSpan = capped * httpConfig.jitter;
  return capped + (jitterSpan > 0 ? Math.random() * jitterSpan : 0);
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * GitHub REST fetch with timeout, 429 / 5xx retries (AppConfig backoff + jitter + Retry-After).
 */
export async function githubHttpFetch(params: {
  url: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  httpConfig: GithubHttpConfig;
}): Promise<GithubHttpFetchResult> {
  const method = params.method ?? 'GET';
  const maxAttempts = params.httpConfig.maxAttempts;
  let attempt = 0;

  while (true) {
    const res = await fetch(params.url, {
      method,
      headers: params.headers,
      body: params.body,
      signal: AbortSignal.timeout(params.httpConfig.timeoutMs),
    });

    const bodyText = await res.text();

    if (isRetryableStatus(res.status) && attempt + 1 < maxAttempts) {
      const delay = retryDelayMs({
        attempt,
        retryAfterHeader: res.headers.get('retry-after'),
        httpConfig: params.httpConfig,
      });
      attempt += 1;
      await sleep(delay);
      continue;
    }

    return { ok: res.ok, status: res.status, bodyText };
  }
}

/** Per-workspace outbound GitHub call limit (`GITHUB_HTTP_MAX_CONCURRENT_REQUESTS_PER_WORKSPACE`). */
export class GithubWorkspaceRequestGate {
  private readonly active = new Map<number, number>();
  private readonly waiters = new Map<number, Array<() => void>>();

  constructor(private readonly maxConcurrent: number) {}

  async run<T>(
    workspaceId: number | undefined,
    fn: () => Promise<T>,
  ): Promise<T> {
    if (
      workspaceId == null ||
      !Number.isFinite(workspaceId) ||
      this.maxConcurrent <= 0
    ) {
      return fn();
    }

    await this.acquire(workspaceId);
    try {
      return await fn();
    } finally {
      this.release(workspaceId);
    }
  }

  private acquire(workspaceId: number): Promise<void> {
    const current = this.active.get(workspaceId) ?? 0;
    if (current < this.maxConcurrent) {
      this.active.set(workspaceId, current + 1);
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const list = this.waiters.get(workspaceId) ?? [];
      list.push(() => resolve());
      this.waiters.set(workspaceId, list);
    });
  }

  private release(workspaceId: number): void {
    const waitQueue = this.waiters.get(workspaceId);
    if (waitQueue && waitQueue.length > 0) {
      const next = waitQueue.shift();
      if (waitQueue.length === 0) {
        this.waiters.delete(workspaceId);
      }
      next?.();
      return;
    }

    const current = this.active.get(workspaceId) ?? 1;
    if (current <= 1) {
      this.active.delete(workspaceId);
    } else {
      this.active.set(workspaceId, current - 1);
    }
  }
}
