import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { basename } from 'path';
import { diskStorage } from 'multer';

/** Max upload size for issue/channel attachments (matches prior memoryStorage limit). */
export const ATTACHMENT_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Stream uploads to OS temp dir; {@link AttachmentService} streams to S3 then deletes the temp file.
 */
export const attachmentUploadMulterOptions = {
  storage: diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, tmpdir());
    },
    filename: (_req, file, cb) => {
      const safe = basename(file.originalname || 'file')
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .slice(0, 120);
      cb(null, `epic-attach-${randomUUID()}-${safe}`);
    },
  }),
  limits: { fileSize: ATTACHMENT_UPLOAD_MAX_BYTES },
};
