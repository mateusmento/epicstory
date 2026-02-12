import { Injectable } from '@nestjs/common';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { AppConfig } from 'src/core/app.config';

@Injectable()
export class LinearTokenCryptoService {
  constructor(private config: AppConfig) {}

  encrypt(plaintext: string): string {
    const keyB64 = this.config.INTEGRATIONS_ENCRYPTION_KEY;
    if (!keyB64) return `v0:${plaintext}`;

    const keyBuf = Buffer.from(keyB64, 'base64');
    if (keyBuf.length !== 32) {
      // Fail closed: don’t “half-encrypt”.
      throw new Error('INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes (base64)');
    }
    // Avoid TS/DOM lib incompatibilities around Buffer(ArrayBufferLike) vs ArrayBuffer.
    const key = Uint8Array.from(keyBuf);

    const iv = Uint8Array.from(randomBytes(12));
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ct1: Buffer = cipher.update(plaintext, 'utf8');
    const ct2: Buffer = cipher.final();
    const ciphertext = Buffer.concat([
      Uint8Array.from(ct1),
      Uint8Array.from(ct2),
    ]);
    const tag = Uint8Array.from(cipher.getAuthTag());

    return `v1:${Buffer.from(iv).toString('base64')}:${Buffer.from(tag).toString('base64')}:${ciphertext.toString('base64')}`;
  }

  decrypt(value: string): string {
    if (value.startsWith('v0:')) return value.slice(3);
    if (!value.startsWith('v1:')) return value; // legacy / unknown

    const keyB64 = this.config.INTEGRATIONS_ENCRYPTION_KEY;
    if (!keyB64) {
      throw new Error('INTEGRATIONS_ENCRYPTION_KEY required to decrypt tokens');
    }

    const keyBuf = Buffer.from(keyB64, 'base64');
    if (keyBuf.length !== 32) {
      throw new Error('INTEGRATIONS_ENCRYPTION_KEY must be 32 bytes (base64)');
    }
    const key = Uint8Array.from(keyBuf);

    const [, ivB64, tagB64, ctB64] = value.split(':', 4);
    const iv = Uint8Array.from(Buffer.from(ivB64, 'base64'));
    const tag = Uint8Array.from(Buffer.from(tagB64, 'base64'));
    const ct = Uint8Array.from(Buffer.from(ctB64, 'base64'));

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const pt1: Buffer = decipher.update(ct);
    const pt2: Buffer = decipher.final();
    const plaintext = Buffer.concat([
      Uint8Array.from(pt1),
      Uint8Array.from(pt2),
    ]);
    return plaintext.toString('utf8');
  }
}
