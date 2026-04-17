import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { isEmpty } from 'lodash';
import sharp from 'sharp';
import { AppConfig } from 'src/core/app.config';
import { createS3Client } from 'src/core/aws';

const AVATAR_SIZE = 120;

/**
 * Profile picture: temp file (Multer disk) → resize → JPEG → S3 → unlink temp.
 * Mirrors {@link AttachmentService#createFromUpload} flow; processing stays in the service, not a custom Multer engine.
 */
@Injectable()
export class UserPictureUploadService {
  private readonly s3: S3Client;

  constructor(private readonly config: AppConfig) {
    this.s3 = createS3Client(config);
  }

  /**
   * Uploads and returns the public URL to store on the user (S3 `Location`).
   */
  async uploadFromMulterFile(
    userId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    const tempPath = file.path;
    if (isEmpty(tempPath)) {
      throw new Error('Multer file has no path');
    }

    const storageKey = `users/pictures/u-${userId}/${randomUUID()}.jpg`;

    const resized = sharp()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .jpeg({ quality: 88 });

    const body = createReadStream(tempPath).pipe(resized);

    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.config.AWS_BUCKET,
          Key: storageKey,
          ContentType: 'image/jpeg',
          Body: body,
        },
      });

      const { Location } = await upload.done();
      if (!Location) {
        throw new Error('Picture upload did not return a location URL');
      }
      return Location;
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }
  }
}
