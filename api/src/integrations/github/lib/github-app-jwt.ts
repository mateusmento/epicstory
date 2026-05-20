import { createSign } from 'crypto';

function base64url(input: Buffer): string {
  return input
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * GitHub App authentication JWT (RS256) for `GET /app/installations/{id}`.
 * @see https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
 */
export function signGithubAppJwt(
  appId: string,
  privateKeyPem: string,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  const pem = privateKeyPem.includes('BEGIN')
    ? privateKeyPem.replace(/\\n/g, '\n')
    : privateKeyPem;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iat: nowSec - 60,
    exp: nowSec + 9 * 60,
    iss: appId,
  };

  const h = base64url(Buffer.from(JSON.stringify(header)));
  const p = base64url(Buffer.from(JSON.stringify(payload)));
  const unsigned = `${h}.${p}`;

  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  sign.end();
  const sig = sign.sign(pem);
  return `${unsigned}.${base64url(sig)}`;
}
