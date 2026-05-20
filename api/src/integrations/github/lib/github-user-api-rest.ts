/** GitHub REST using a member user token (installation token stays in GithubApiService). */

const GH_ACCEPT = 'application/vnd.github+json';
const GH_VER = '2022-11-28';

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

type GithubUserFetchResult = {
  ok: boolean;
  status: number;
  bodyText: string;
};

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
    throw new Error(
      `GitHub ref/heads resolve failed (${res.status}): ${res.bodyText}`,
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new Error('GitHub returned non-JSON payload for GET ref/heads');
  }
  const gh = body as { object?: { sha?: string } };
  const sha = gh.object?.sha;
  if (!sha || typeof sha !== 'string') {
    throw new Error('GitHub returned unexpected ref payload');
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
    throw new Error(
      `GitHub create ref failed (${res.status}) for refs/heads/${branchLeaf}: ${res.bodyText}`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new Error('GitHub create ref returned non-JSON payload');
  }
  const gh = parsed as {
    ref?: string;
    object?: { sha?: string };
  };
  const refStr = gh.ref;
  const objectSha = gh.object?.sha;
  if (!refStr || !objectSha) {
    throw new Error('GitHub returned unexpected create-ref payload');
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
    throw new Error(`GitHub open PR failed (${res.status}): ${res.bodyText}`);
  }

  try {
    return JSON.parse(res.bodyText) as unknown;
  } catch {
    throw new Error('GitHub open PR returned non-JSON payload');
  }
}
