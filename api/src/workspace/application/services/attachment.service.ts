import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { basename } from 'path';
import { Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { createS3Client } from 'src/core/aws';
import { Attachment } from '../../domain/entities/attachment.entity';
import { isEmpty } from 'lodash';
import { Readable } from 'stream';

export type CreatedAttachmentDto = {
  id: number;
  url: string;
  mimeType: string;
  originalFilename: string;
  byteSize: number;
};

@Injectable()
export class AttachmentService {
  private readonly s3: S3Client;

  constructor(
    @InjectRepository(Attachment)
    private readonly attachments: Repository<Attachment>,
    private readonly config: AppConfig,
  ) {
    this.s3 = createS3Client(config);
  }

  async createFromUpload(params: {
    workspaceId: number;
    channelId?: number | null;
    issueId?: number | null;
    messageId?: number | null;
    uploadedById: number;
    file: Express.Multer.File;
  }): Promise<CreatedAttachmentDto> {
    const { workspaceId, uploadedById, file } = params;
    const safeBase = basename(file.originalname || 'file')
      .replace(/[^a-zA-Z0-9._-]+/g, '_')
      .slice(0, 120);

    const storageKey = `attachments/w-${workspaceId}/${randomUUID()}-${safeBase}`;

    const tempPath = file.path;

    const body: Buffer | Readable = (() => {
      if (!isEmpty(tempPath)) {
        return createReadStream(tempPath);
      } else if (file.buffer?.length > 0) {
        return file.buffer;
      } else {
        throw new Error('Multer file has neither path nor buffer');
      }
    })();

    try {
      const upload = new Upload({
        client: this.s3,
        params: {
          Bucket: this.config.AWS_BUCKET,
          Key: storageKey,
          ContentType: file.mimetype,
          Body: body,
        },
      });

      const { Location } = await upload.done();
      if (!Location) {
        throw new Error('Upload did not return a location URL');
      }

      const row = this.attachments.create({
        workspaceId,
        channelId: params.channelId ?? null,
        issueId: params.issueId ?? null,
        messageId: params.messageId ?? null,
        uploadedById,
        storageKey,
        publicUrl: Location,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        byteSize: String(file.size),
      });
      await this.attachments.save(row);

      return {
        id: row.id,
        url: row.publicUrl,
        mimeType: row.mimeType,
        originalFilename: row.originalFilename,
        byteSize: file.size,
      };
    } finally {
      if (!isEmpty(tempPath)) {
        await unlink(tempPath).catch(() => {});
      }
    }
  }

  async listForChannel(
    workspaceId: number,
    channelId: number,
    limit = 30,
  ): Promise<CreatedAttachmentDto[]> {
    const rows = await this.attachments.find({
      where: { workspaceId, channelId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
    return rows.map((r) => ({
      id: r.id,
      url: r.publicUrl,
      mimeType: r.mimeType,
      originalFilename: r.originalFilename,
      byteSize: Number(r.byteSize),
    }));
  }

  async listForIssue(
    workspaceId: number,
    issueId: number,
    limit = 30,
  ): Promise<CreatedAttachmentDto[]> {
    const rows = await this.attachments.find({
      where: { workspaceId, issueId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 100),
    });
    return rows.map((r) => ({
      id: r.id,
      url: r.publicUrl,
      mimeType: r.mimeType,
      originalFilename: r.originalFilename,
      byteSize: Number(r.byteSize),
    }));
  }
}
