/** GitHub REST using a member user token (installation token stays in GithubApiService). */

const GH_ACCEPT = 'application/vnd.github+json';
const GH_VER = '2022-11-28';

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

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
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
  maxRetries?: number;
}): Promise<GithubUserFetchResult> {
  const maxRetries = params.maxRetries ?? 3;
  let attempt = 0;

  while (true) {
    const method = params.method ?? 'GET';
    const res = await fetch(params.url, {
      method,
      headers: {
        Authorization: `Bearer ${params.userAccessToken}`,
        Accept: GH_ACCEPT,
        'X-GitHub-Api-Version': GH_VER,
        ...(params.jsonBody !== undefined && method !== 'GET'
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
      body:
        params.jsonBody !== undefined && method !== 'GET'
          ? JSON.stringify(params.jsonBody)
          : undefined,
    });

    const bodyText = await res.text();

    if ((res.status === 429 || res.status >= 520) && attempt < maxRetries) {
      const retryAfter = res.headers.get('retry-after');
      const retrySecondsNum = retryAfter != null ? Number(retryAfter) : NaN;
      const backoffMs =
        Number.isFinite(retrySecondsNum) && retrySecondsNum > 0
          ? retrySecondsNum * 1000
          : Math.min(5000, 300 * Math.pow(2, attempt));
      attempt += 1;
      await sleep(backoffMs);
      continue;
    }

    return { ok: res.ok, status: res.status, bodyText };
  }
}

export async function githubGetRefHeadSha(params: {
  token: string;
  owner: string;
  repo: string;
  headBranchName: string;
}): Promise<string> {
  const o = encodeURIComponent(params.owner.trim());
  const r = encodeURIComponent(params.repo.trim());
  const branch = encodeURIComponent(params.headBranchName.trim());
  const url = `https://api.github.com/repos/${o}/${r}/git/ref/heads/${branch}`;
  const res = await githubUserFetchWithRetries({
    userAccessToken: params.token,
    url,
    method: 'GET',
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
