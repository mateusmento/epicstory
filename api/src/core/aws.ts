import { S3Client } from '@aws-sdk/client-s3';
import type { AppConfig } from './app.config';

export function createS3Client(config: AppConfig): S3Client {
  return new S3Client({
    region: config.AWS_REGION,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID.trim(),
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    },
  });
}
