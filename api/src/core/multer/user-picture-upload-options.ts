import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { basename } from 'path';
import { diskStorage } from 'multer';

/** Max upload size for profile pictures (before resize). */
export const USER_PICTURE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Writes uploads to OS temp; {@link UserPictureUploadService} resizes, streams to S3, deletes temp file.
 */
export const userPictureUploadMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, tmpdir());
    },
    filename: (_req, file, cb) => {
      const safe = basename(file.originalname || 'picture')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 120);
      cb(null, `epic-user-pic-${randomUUID()}-${safe}`);
    },
  }),
  limits: { fileSize: USER_PICTURE_UPLOAD_MAX_BYTES },
};
