/** GitHub REST using a member user token (installation token stays in GithubApiService). */

import {
  type GithubHttpConfig,
  githubHttpFetch,
  githubRestJsonHeaders,
} from './github-http-client';

export class GithubUserRestHttpError extends Error {
  override readonly name = 'GithubUserRestHttpError';

  constructor(
    /** HTTP status from GitHub. */
    readonly statusCode: number,
    readonly summary: string,
    /** Untrimmed JSON/text body (truncate for logs if needed). */
    readonly rawBodySnippet: string,
  ) {
    super(summary);
  }
}

type GithubUserFetchResult = {
  ok: boolean;
  status: number;
  bodyText: string;
};

/** Best-effort message line from GitHub error JSON ({ message, errors[] }). */
export function summarizeGithubRestErrorBody(bodyText: string): string {
  const trimmed = bodyText.trim();
  if (!trimmed) return '';

  try {
    const j = JSON.parse(trimmed) as {
      message?: unknown;
      errors?: unknown;
    };

    let line = '';
    if (typeof j.message === 'string' && j.message.trim()) {
      line = j.message.trim();
    }

    const errs = j.errors;
    if (Array.isArray(errs) && errs.length > 0) {
      const first = errs[0];
      let m = '';
      if (typeof first === 'string') {
        m = first.trim();
      } else if (first !== null && typeof first === 'object') {
        const msg = (first as { message?: unknown }).message;
        m = typeof msg === 'string' ? msg.trim() : '';
      }
      if (m) {
        line = line ? `${line}: ${m}` : m;
      }
    }

    return line.slice(0, 2000);
  } catch {
    return trimmed.slice(0, 2000);
  }
}

export function githubUserThrowHttp(params: {
  status: number;
  bodyText: string;
  fallbackLabel: string;
}): never {
  const extra = summarizeGithubRestErrorBody(params.bodyText);
  const summary =
    extra.length > 0
      ? `${params.fallbackLabel} (${params.status}): ${extra}`
      : `${params.fallbackLabel} (${params.status})`;

  throw new GithubUserRestHttpError(
    params.status,
    summary,
    params.bodyText.slice(0, 4096),
  );
}

async function githubUserFetchWithRetries(params: {
  userAccessToken: string;
  url: string;
  method?: 'GET' | 'POST';
  jsonBody?: unknown;
  httpConfig: GithubHttpConfig;
}): Promise<GithubUserFetchResult> {
  const method = params.method ?? 'GET';
  const headers = githubRestJsonHeaders(
    params.userAccessToken,
    params.jsonBody !== undefined && method !== 'GET'
      ? { 'Content-Type': 'application/json' }
      : undefined,
  );

  const res = await githubHttpFetch({
    url: params.url,
    method,
    headers,
    body:
      params.jsonBody !== undefined && method !== 'GET'
        ? JSON.stringify(params.jsonBody)
        : undefined,
    httpConfig: params.httpConfig,
  });

  return { ok: res.ok, status: res.status, bodyText: res.bodyText };
}

export async function githubGetRefHeadSha(params: {
  token: string;
  owner: string;
  repo: string;
  headBranchName: string;
  httpConfig: GithubHttpConfig;
}): Promise<string> {
  const o = encodeURIComponent(params.owner.trim());
  const r = encodeURIComponent(params.repo.trim());
  const branch = encodeURIComponent(params.headBranchName.trim());
  const url = `https://api.github.com/repos/${o}/${r}/git/ref/heads/${branch}`;
  const res = await githubUserFetchWithRetries({
    userAccessToken: params.token,
    url,
    method: 'GET',
    httpConfig: params.httpConfig,
  });

  if (!res.ok) {
    githubUserThrowHttp({
      status: res.status,
      bodyText: res.bodyText,
      fallbackLabel: `GitHub ref/heads/${params.headBranchName.trim()}`,
    });
  }

  let body: unknown;
  try {
    body = JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new GithubUserRestHttpError(
      res.status,
      'GitHub returned non-JSON payload for GET ref/heads',
      res.bodyText.slice(0, 4096),
    );
  }
  const gh = body as { object?: { sha?: string } };
  const sha = gh.object?.sha;
  if (!sha || typeof sha !== 'string') {
    throw new GithubUserRestHttpError(
      200,
      'GitHub returned unexpected ref payload',
      res.bodyText.slice(0, 4096),
    );
  }
  return sha;
}

export async function githubCreateGitRef(params: {
  token: string;
  owner: string;
  repo: string;
  /** Branch leaf name only (`foo`, not `refs/heads/foo`). */
  branchNameOnly: string;
  /** Commit SHA the new branch tip should reference. */
  sha: string;
  httpConfig: GithubHttpConfig;
}): Promise<{ ref: string; objectSha: string }> {
  const o = encodeURIComponent(params.owner.trim());
  const r = encodeURIComponent(params.repo.trim());
  const url = `https://api.github.com/repos/${o}/${r}/git/refs`;
  const branchLeaf = params.branchNameOnly.trim().replace(/^refs\/heads\//, '');

  const res = await githubUserFetchWithRetries({
    userAccessToken: params.token,
    url,
    method: 'POST',
    jsonBody: {
      ref: `refs/heads/${branchLeaf}`,
      sha: params.sha,
    },
    httpConfig: params.httpConfig,
  });

  if (!res.ok) {
    githubUserThrowHttp({
      status: res.status,
      bodyText: res.bodyText,
      fallbackLabel: `GitHub create refs/heads/${branchLeaf}`,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new GithubUserRestHttpError(
      res.status,
      'GitHub create ref returned non-JSON payload',
      res.bodyText.slice(0, 4096),
    );
  }
  const gh = parsed as {
    ref?: string;
    object?: { sha?: string };
  };
  const refStr = gh.ref;
  const objectSha = gh.object?.sha;
  if (!refStr || !objectSha) {
    throw new GithubUserRestHttpError(
      res.status,
      'GitHub returned unexpected create-ref payload',
      res.bodyText.slice(0, 4096),
    );
  }
  return { ref: refStr, objectSha };
}

export async function githubCreatePullRequest(params: {
  token: string;
  owner: string;
  repo: string;
  /** Same-repo head branch leaf name only. */
  headBranchName: string;
  /** Base branch leaf name only. */
  baseBranchName: string;
  title: string;
  bodyMarkdown: string;
  draft: boolean;
  httpConfig: GithubHttpConfig;
}): Promise<unknown> {
  const o = encodeURIComponent(params.owner.trim());
  const r = encodeURIComponent(params.repo.trim());
  const url = `https://api.github.com/repos/${o}/${r}/pulls`;
  const res = await githubUserFetchWithRetries({
    userAccessToken: params.token,
    url,
    method: 'POST',
    jsonBody: {
      title: params.title,
      body: params.bodyMarkdown,
      head: params.headBranchName.trim(),
      base: params.baseBranchName.trim(),
      draft: params.draft,
    },
    httpConfig: params.httpConfig,
  });

  if (!res.ok) {
    githubUserThrowHttp({
      status: res.status,
      bodyText: res.bodyText,
      fallbackLabel: 'GitHub open pull request',
    });
  }

  try {
    return JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new GithubUserRestHttpError(
      res.status,
      'GitHub open PR returned non-JSON payload',
      res.bodyText.slice(0, 4096),
    );
  }
}

/** Returns false on HTTP 404; rethrows other GitHub errors. */
export async function githubRepoBranchExists(params: {
  token: string;
  owner: string;
  repo: string;
  branchName: string;
  httpConfig: GithubHttpConfig;
}): Promise<boolean> {
  try {
    await githubGetRefHeadSha({
      token: params.token,
      owner: params.owner,
      repo: params.repo,
      headBranchName: params.branchName,
      httpConfig: params.httpConfig,
    });
    return true;
  } catch (e: unknown) {
    if (e instanceof GithubUserRestHttpError && e.statusCode === 404) {
      return false;
    }
    throw e;
  }
}

export async function githubListRepoBranches(params: {
  token: string;
  owner: string;
  repo: string;
  page: number;
  perPage: number;
  httpConfig: GithubHttpConfig;
}): Promise<{ branches: { name: string }[]; hasNextPage: boolean }> {
  const o = encodeURIComponent(params.owner.trim());
  const r = encodeURIComponent(params.repo.trim());
  const perPage = Math.min(100, Math.max(1, params.perPage));
  const page = Math.max(1, params.page);
  const url = `https://api.github.com/repos/${o}/${r}/branches?per_page=${perPage}&page=${page}`;
  const res = await githubUserFetchWithRetries({
    userAccessToken: params.token,
    url,
    method: 'GET',
    httpConfig: params.httpConfig,
  });

  if (!res.ok) {
    githubUserThrowHttp({
      status: res.status,
      bodyText: res.bodyText,
      fallbackLabel: `GitHub list branches for ${params.owner}/${params.repo}`,
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new GithubUserRestHttpError(
      res.status,
      'GitHub list branches returned non-JSON payload',
      res.bodyText.slice(0, 4096),
    );
  }

  if (!Array.isArray(parsed)) {
    throw new GithubUserRestHttpError(
      200,
      'GitHub list branches returned unexpected payload',
      res.bodyText.slice(0, 4096),
    );
  }

  const branches: { name: string }[] = [];
  for (const row of parsed) {
    if (row !== null && typeof row === 'object' && !Array.isArray(row)) {
      const name = (row as { name?: unknown }).name;
      if (typeof name === 'string' && name.trim()) {
        branches.push({ name: name.trim() });
      }
    }
  }

  return { branches, hasNextPage: branches.length >= perPage };
}
