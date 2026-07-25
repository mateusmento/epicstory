import {
  DeleteObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  IIssueAttachmentListItem,
  UploadedAttachment,
} from '@epicstory/contracts';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { basename } from 'path';
import { In, Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { createS3Client } from 'src/core/aws';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { SCHEDULING_SCHEMA } from 'src/scheduling/constants';
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Attachment } from '../../domain/entities/attachment.entity';
import { isEmpty, uniq } from 'lodash';
import { Readable } from 'stream';

/** Shared SQL fragment: attachment has zero reference joins. */
const ATTACHMENT_UNREFERENCED_SQL = `
  NOT EXISTS (
    SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
    WHERE ma.attachment_id = a.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
    WHERE mra.attachment_id = a.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "${CHANNEL_SCHEMA}".message_draft_attachments mda
    WHERE mda.attachment_id = a.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM "${SCHEDULING_SCHEMA}".scheduled_job_attachments sja
    WHERE sja.attachment_id = a.id
  )
`;

/**
 * Workspace blob custody: upload, issue listing/delete helpers, S3 orphan sweep.
 * Attachment reference joins / GC live in channel AttachmentReferencesService.
 */
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
    uploadedById: number;
    file: Express.Multer.File;
  }): Promise<UploadedAttachment> {
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
        uploadedById,
        storageKey,
        publicUrl: Location,
        mimeType: file.mimetype,
        originalFilename: file.originalname,
        byteSize: String(file.size),
      });
      await this.attachments.save(row);

      return this.toUploadedDto(row);
    } finally {
      if (!isEmpty(tempPath)) {
        await unlink(tempPath).catch(() => {});
      }
    }
  }

  /**
   * Validates issue-scoped delete. Caller must release Attachment references
   * first, then {@link clearIssueId} + {@link deleteBlobsIfStillUnreferenced}.
   */
  async requireDeletableIssueAttachment(params: {
    workspaceId: number;
    issueId: number;
    attachmentId: number;
    commentChannelId: number | null;
    issuerId: number;
  }): Promise<Attachment> {
    const row = await this.findAttachmentForIssueScope(params);
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }
    if (row.uploadedById !== params.issuerId) {
      throw new ForbiddenException(
        'You can only remove attachments you uploaded',
      );
    }
    return row;
  }

  async listIdsForIssuePurge(params: {
    workspaceId: number;
    issueId: number;
    commentChannelId: number | null;
  }): Promise<number[]> {
    const { workspaceId, issueId, commentChannelId } = params;
    let rows: Attachment[];
    if (commentChannelId == null) {
      rows = await this.attachments.find({ where: { workspaceId, issueId } });
    } else {
      rows = await this.attachments
        .createQueryBuilder('a')
        .where('a.workspace_id = :ws', { ws: workspaceId })
        .andWhere(
          `(
            a.issue_id = :issueId
            OR (
              a.channel_id = :cc
              AND (
                EXISTS (
                  SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
                  WHERE ma.attachment_id = a.id
                )
                OR EXISTS (
                  SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
                  WHERE mra.attachment_id = a.id
                )
              )
            )
          )`,
          { issueId, cc: commentChannelId },
        )
        .getMany();
    }
    return rows.map((r) => r.id);
  }

  async deleteAllForWorkspace(workspaceId: number): Promise<void> {
    await this.attachments.delete({ workspaceId });
    await this.deleteS3Prefix(`attachments/w-${workspaceId}/`);
  }

  private async deleteS3Prefix(prefix: string): Promise<void> {
    try {
      let continuationToken: string | undefined;
      do {
        const listed = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.config.AWS_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        const keys = (listed.Contents ?? [])
          .map((o) => o.Key)
          .filter((k): k is string => !!k);
        for (const Key of keys) {
          try {
            await this.s3.send(
              new DeleteObjectCommand({
                Bucket: this.config.AWS_BUCKET,
                Key,
              }),
            );
          } catch {
            // Best-effort orphan cleanup.
          }
        }
        continuationToken = listed.IsTruncated
          ? listed.NextContinuationToken
          : undefined;
      } while (continuationToken);
    } catch {
      // Best-effort: missing ListObjects permission should not block purge.
    }
  }

  private async deleteS3Keys(
    storageKeys: string[],
    bestEffortS3: boolean,
  ): Promise<void> {
    for (const Key of storageKeys) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.config.AWS_BUCKET,
            Key,
          }),
        );
      } catch (err) {
        if (!bestEffortS3) {
          throw err;
        }
      }
    }
  }

  private async findAttachmentForIssueScope(params: {
    workspaceId: number;
    issueId: number;
    attachmentId: number;
    commentChannelId: number | null;
  }): Promise<Attachment | null> {
    const { workspaceId, issueId, attachmentId, commentChannelId } = params;
    if (commentChannelId == null) {
      return this.attachments.findOne({
        where: { id: attachmentId, workspaceId, issueId },
      });
    }

    return this.attachments
      .createQueryBuilder('a')
      .where('a.id = :attachmentId', { attachmentId })
      .andWhere('a.workspace_id = :workspaceId', { workspaceId })
      .andWhere(
        `(
          a.issue_id = :issueId
          OR (
            a.channel_id = :commentChannelId
            AND (
              EXISTS (
                SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
                WHERE ma.attachment_id = a.id
              )
              OR EXISTS (
                SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
                WHERE mra.attachment_id = a.id
              )
            )
          )
        )`,
        { issueId, commentChannelId },
      )
      .getOne();
  }

  async listForIssue(
    workspaceId: number,
    issueId: number,
    limit = 30,
    commentChannelId?: number | null,
  ): Promise<IIssueAttachmentListItem[]> {
    const take = Math.min(limit, 100);
    let rows: Attachment[];
    if (commentChannelId == null) {
      rows = await this.attachments.find({
        where: { workspaceId, issueId },
        order: { createdAt: 'DESC' },
        take,
      });
    } else {
      rows = await this.attachments
        .createQueryBuilder('a')
        .where('a.workspace_id = :ws', { ws: workspaceId })
        .andWhere(
          `(
            a.issue_id = :issueId
            OR (
              a.channel_id = :cc
              AND (
                EXISTS (
                  SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
                  WHERE ma.attachment_id = a.id
                )
                OR EXISTS (
                  SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
                  WHERE mra.attachment_id = a.id
                )
              )
            )
          )`,
          { issueId, cc: commentChannelId },
        )
        .orderBy('a.created_at', 'DESC')
        .take(take)
        .getMany();
    }

    const parentByAttachment = await this.findPrimaryParentsForAttachments(
      rows.map((r) => r.id),
    );
    return rows.map((r) =>
      this.toIssueListItemDto(r, parentByAttachment.get(r.id)),
    );
  }

  async sweepS3Orphans(): Promise<number> {
    const graceHours = this.config.ATTACHMENT_S3_ORPHAN_GRACE_HOURS ?? 24;
    const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1000);
    let removed = 0;
    try {
      let continuationToken: string | undefined;
      do {
        const listed = await this.s3.send(
          new ListObjectsV2Command({
            Bucket: this.config.AWS_BUCKET,
            Prefix: 'attachments/',
            ContinuationToken: continuationToken,
          }),
        );
        for (const obj of listed.Contents ?? []) {
          if (!obj.Key || !obj.LastModified) continue;
          if (obj.LastModified >= cutoff) continue;
          const exists = await this.attachments.exists({
            where: { storageKey: obj.Key },
          });
          if (exists) continue;
          try {
            await this.s3.send(
              new DeleteObjectCommand({
                Bucket: this.config.AWS_BUCKET,
                Key: obj.Key,
              }),
            );
            removed += 1;
          } catch {
            // best-effort
          }
        }
        continuationToken = listed.IsTruncated
          ? listed.NextContinuationToken
          : undefined;
      } while (continuationToken);
    } catch {
      // best-effort
    }
    return removed;
  }

  private async findPrimaryParentsForAttachments(
    attachmentIds: number[],
  ): Promise<
    Map<number, { messageId: number | null; messageReplyId: number | null }>
  > {
    const ids = uniq(attachmentIds.filter(Boolean));
    const map = new Map<
      number,
      { messageId: number | null; messageReplyId: number | null }
    >();
    if (ids.length === 0) return map;

    const msgRows: { attachment_id: number; message_id: number }[] =
      await this.attachments.manager.query(
        `
        SELECT DISTINCT ON (attachment_id) attachment_id, message_id
        FROM "${CHANNEL_SCHEMA}".message_attachments
        WHERE attachment_id = ANY($1::int[])
        ORDER BY attachment_id, message_id ASC
      `,
        [ids],
      );
    const replyRows: { attachment_id: number; message_reply_id: number }[] =
      await this.attachments.manager.query(
        `
        SELECT DISTINCT ON (attachment_id) attachment_id, message_reply_id
        FROM "${CHANNEL_SCHEMA}".message_reply_attachments
        WHERE attachment_id = ANY($1::int[])
        ORDER BY attachment_id, message_reply_id ASC
      `,
        [ids],
      );

    for (const id of ids) {
      map.set(id, { messageId: null, messageReplyId: null });
    }
    for (const r of msgRows) {
      const cur = map.get(Number(r.attachment_id));
      if (cur) cur.messageId = Number(r.message_id);
    }
    for (const r of replyRows) {
      const cur = map.get(Number(r.attachment_id));
      if (cur) cur.messageReplyId = Number(r.message_reply_id);
    }
    return map;
  }

  async lockRowsForAssociate(ids: number[]): Promise<
    {
      id: number;
      workspace_id: number;
      channel_id: number | null;
      uploaded_by_id: number;
      issue_id: number | null;
    }[]
  > {
    const unique = uniq(ids.filter((n) => n > 0));
    if (unique.length === 0) return [];
    return this.attachments.manager.query(
      `
      SELECT id, workspace_id, channel_id, uploaded_by_id, issue_id
      FROM "${WORKSPACE_SCHEMA}".attachments
      WHERE id = ANY($1::int[])
      FOR UPDATE
    `,
      [unique],
    );
  }

  async listUploadedByIds(
    workspaceId: number,
    ids: number[],
  ): Promise<UploadedAttachment[]> {
    const unique = uniq(ids.filter((n) => n > 0));
    if (unique.length === 0) return [];
    const rows = await this.attachments.find({
      where: { workspaceId, id: In(unique) },
      order: { id: 'ASC' },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return unique
      .map((id) => byId.get(id))
      .filter((r): r is Attachment => r != null)
      .map((r) => this.toUploadedDto(r));
  }

  async bindIssueId(
    workspaceId: number,
    ids: number[],
    issueId: number,
  ): Promise<void> {
    const unique = uniq(ids.filter((n) => n > 0));
    if (unique.length === 0) return;
    await this.attachments.update({ id: In(unique), workspaceId }, { issueId });
  }

  /**
   * Atomically delete attachment rows that are still unreferenced
   * (`issue_id IS NULL` and zero joins), then best-effort S3 cleanup for
   * returned keys. Concurrent sync that inserts a join loses the race safely.
   * @returns ids that were actually deleted
   */
  async deleteBlobsIfStillUnreferenced(ids: number[]): Promise<number[]> {
    const unique = uniq(ids.filter((n) => n > 0));
    if (unique.length === 0) return [];

    const deleted: { id: number; storage_key: string }[] =
      await this.attachments.manager.query(
        `
        DELETE FROM "${WORKSPACE_SCHEMA}".attachments a
        WHERE a.id = ANY($1::int[])
          AND a.issue_id IS NULL
          AND ${ATTACHMENT_UNREFERENCED_SQL}
        RETURNING a.id, a.storage_key
      `,
        [unique],
      );

    if (deleted.length === 0) return [];
    await this.deleteS3Keys(
      deleted.map((r) => r.storage_key),
      true,
    );
    return deleted.map((r) => Number(r.id));
  }

  async clearIssueId(attachmentId: number): Promise<void> {
    await this.attachments.update({ id: attachmentId }, { issueId: null });
  }

  toUploadedDto(r: Attachment): UploadedAttachment {
    return {
      id: r.id,
      url: r.publicUrl,
      mimeType: r.mimeType,
      originalFilename: r.originalFilename,
      byteSize: Number(r.byteSize),
      uploadedById: r.uploadedById,
    } satisfies UploadedAttachment;
  }

  private toIssueListItemDto(
    r: Attachment,
    parent?: { messageId: number | null; messageReplyId: number | null },
  ): IIssueAttachmentListItem {
    return {
      ...this.toUploadedDto(r),
      issueId: r.issueId ?? null,
      messageId: parent?.messageId ?? null,
      messageReplyId: parent?.messageReplyId ?? null,
    };
  }
}
