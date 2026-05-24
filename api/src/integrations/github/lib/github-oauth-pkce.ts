import { createHash, randomBytes } from 'crypto';

/** RFC 7636 code verifier (43–128 chars from unreserved set). */
export function createGithubOAuthCodeVerifier(): string {
  return randomBytes(32).toString('base64url');
}

/** S256 code challenge for GitHub App user authorization (plain is not supported). */
export function createGithubOAuthCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}
