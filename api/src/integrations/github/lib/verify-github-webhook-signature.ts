import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies GitHub `X-Hub-Signature-256` (`sha256=<hex hmac>`) for the raw POST body.
 */
export function verifyGithubWebhookSignature256(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) {
    return false;
  }
  const expectedHex = signatureHeader.slice('sha256='.length).trim();
  const digestHex = createHmac('sha256', secret).update(rawBody).digest('hex');

  try {
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(digestHex, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
