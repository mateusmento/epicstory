import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
  BadRequestException,
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
import { WORKSPACE_SCHEMA } from 'src/workspace/constants';
import { Attachment } from '../../domain/entities/attachment.entity';
import { isEmpty, uniq } from 'lodash';
import { Readable } from 'stream';

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
        uploadedById: uploadedById,
      } satisfies UploadedAttachment;
    } finally {
      if (!isEmpty(tempPath)) {
        await unlink(tempPath).catch(() => {});
      }
    }
  }

  /** Files linked to top-level channel messages (presentation below message body). */
  async listAnchoredForMessage(
    workspaceId: number,
    messageId: number,
  ): Promise<UploadedAttachment[]> {
    const rows = await this.attachments.find({
      where: { workspaceId, messageId },
      order: { id: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  /** Files linked to thread replies (same shape as messages). */
  async listAnchoredForReply(
    workspaceId: number,
    replyId: number,
  ): Promise<UploadedAttachment[]> {
    const rows = await this.attachments.find({
      where: { workspaceId, messageReplyId: replyId },
      order: { id: 'ASC' },
    });
    return rows.map((r) => this.toDto(r));
  }

  async listAnchoredForMessages(
    workspaceId: number,
    messageIds: number[],
  ): Promise<Map<number, UploadedAttachment[]>> {
    const ids = uniq(messageIds.filter(Boolean));
    if (ids.length === 0) return new Map();
    const rows = await this.attachments.find({
      where: { workspaceId, messageId: In(ids) },
      order: { id: 'ASC' },
    });
    const map = new Map<number, UploadedAttachment[]>();
    for (const r of rows) {
      if (r.messageId == null) continue;
      const list = map.get(r.messageId) ?? [];
      list.push(this.toDto(r));
      map.set(r.messageId, list);
    }
    return map;
  }

  async listAnchoredForReplies(
    workspaceId: number,
    replyIds: number[],
  ): Promise<Map<number, UploadedAttachment[]>> {
    const ids = uniq(replyIds.filter(Boolean));
    if (ids.length === 0) return new Map();
    const rows = await this.attachments.find({
      where: { workspaceId, messageReplyId: In(ids) },
      order: { id: 'ASC' },
    });
    const map = new Map<number, UploadedAttachment[]>();
    for (const r of rows) {
      if (r.messageReplyId == null) continue;
      const list = map.get(r.messageReplyId) ?? [];
      list.push(this.toDto(r));
      map.set(r.messageReplyId, list);
    }
    return map;
  }

  async listForChannel(
    workspaceId: number,
    channelId: number,
    limit = 100,
  ): Promise<UploadedAttachment[]> {
    const rows = await this.attachments
      .createQueryBuilder('a')
      .where('a.workspace_id = :ws', { ws: workspaceId })
      .andWhere('a.channel_id = :ch', { ch: channelId })
      .andWhere('(a.message_id IS NOT NULL OR a.message_reply_id IS NOT NULL)')
      .orderBy('a.created_at', 'DESC')
      .take(Math.min(limit, 100))
      .getMany();
    return rows.map((r) => this.toDto(r));
  }

  /**
   * Permanently removes an attachment linked to an issue (description upload or issue thread),
   * if it matches {@link listForIssue} scope. Deletes the S3 object then the row.
   */
  async deleteForIssue(params: {
    workspaceId: number;
    issueId: number;
    attachmentId: number;
    commentChannelId: number | null;
    issuerId: number;
  }): Promise<void> {
    const row = await this.findAttachmentForIssueScope(params);
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }
    if (row.uploadedById !== params.issuerId) {
      throw new ForbiddenException(
        'You can only remove attachments you uploaded',
      );
    }

    await this.deleteStoredFilesAndRows([row], false);
  }

  /**
   * When a channel message (thread root) is deleted: remove all reply-anchored files first, then
   * message-anchored files. Matches {@link linkStagingToMessage} / {@link linkStagingToReply} scope.
   */
  async deleteAnchoredForDeletedThreadRoot(params: {
    workspaceId: number;
    messageId: number;
    replyIds: number[];
  }): Promise<void> {
    const replyIds = uniq(params.replyIds.filter((id) => id > 0));
    if (replyIds.length > 0) {
      const replyRows = await this.attachments.find({
        where: {
          workspaceId: params.workspaceId,
          messageReplyId: In(replyIds),
        },
      });
      await this.deleteStoredFilesAndRows(replyRows, true);
    }
    const messageRows = await this.attachments.find({
      where: { workspaceId: params.workspaceId, messageId: params.messageId },
    });
    await this.deleteStoredFilesAndRows(messageRows, true);
  }

  /** When a thread reply is deleted: remove files anchored to that reply. */
  async deleteAnchoredForDeletedReply(params: {
    workspaceId: number;
    replyId: number;
  }): Promise<void> {
    const rows = await this.attachments.find({
      where: {
        workspaceId: params.workspaceId,
        messageReplyId: params.replyId,
      },
    });
    await this.deleteStoredFilesAndRows(rows, true);
  }

  private async deleteStoredFilesAndRows(
    rows: Attachment[],
    bestEffortS3: boolean,
  ): Promise<void> {
    for (const row of rows) {
      try {
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: this.config.AWS_BUCKET,
            Key: row.storageKey,
          }),
        );
      } catch (err) {
        if (!bestEffortS3) {
          throw err;
        }
        /* Best-effort: still drop DB row so we do not leak attachment references. */
      }
      await this.attachments.delete({ id: row.id });
    }
  }

  /**
   * Permanently removes an attachment linked to a channel message/reply (edit flow).
   * Row must belong to the channel and be anchored; same uploader rule as {@link deleteForIssue}.
   */
  async deleteForChannel(params: {
    workspaceId: number;
    channelId: number;
    attachmentId: number;
    issuerId: number;
  }): Promise<void> {
    const row = await this.attachments.findOne({
      where: { id: params.attachmentId, workspaceId: params.workspaceId },
    });
    if (!row) {
      throw new NotFoundException('Attachment not found');
    }
    if (row.channelId !== params.channelId) {
      throw new NotFoundException('Attachment not found');
    }
    if (row.messageId == null && row.messageReplyId == null) {
      throw new NotFoundException('Attachment not found');
    }
    if (row.uploadedById !== params.issuerId) {
      throw new ForbiddenException(
        'You can only remove attachments you uploaded',
      );
    }

    await this.deleteStoredFilesAndRows([row], false);
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
        `(a.issue_id = :issueId OR (a.channel_id = :commentChannelId AND (a.message_id IS NOT NULL OR a.message_reply_id IS NOT NULL)))`,
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
    if (commentChannelId == null) {
      const rows = await this.attachments.find({
        where: { workspaceId, issueId },
        order: { createdAt: 'DESC' },
        take,
      });
      return rows.map((r) => this.toIssueListItemDto(r));
    }

    const qb = this.attachments
      .createQueryBuilder('a')
      .where('a.workspace_id = :ws', { ws: workspaceId })
      .andWhere(
        '(a.issue_id = :issueId OR (a.channel_id = :cc AND (a.message_id IS NOT NULL OR a.message_reply_id IS NOT NULL)))',
        { issueId, cc: commentChannelId },
      )
      .orderBy('a.created_at', 'DESC')
      .take(take);

    const rows = await qb.getMany();
    return rows.map((r) => this.toIssueListItemDto(r));
  }

  /**
   * Bind staged uploads to a posted message (composer → send). Rows must match
   * workspace/channel/uploader and still be unlinked; optional issue tag must match {@link matchedIssueId}.
   */
  async linkStagingToMessage(params: {
    workspaceId: number;
    channelId: number;
    uploadedById: number;
    messageId: number;
    attachmentIds: number[] | undefined;
    matchedIssueId?: number;
  }): Promise<void> {
    const ids = uniq((params.attachmentIds ?? []).filter((n) => n > 0));
    if (ids.length === 0) {
      return;
    }
    const rows = await this.lockStagingRows(ids);
    if (rows.length !== ids.length) {
      throw new BadRequestException(
        'One or more attachments are unavailable, expired, or already linked',
      );
    }
    const minCreatedAt = this.stagingFreshnessCutoff();
    for (const row of rows) {
      this.assertStagingRowEligible(row, params, minCreatedAt);
    }
    const patch: Partial<Attachment> = { messageId: params.messageId };
    if (params.matchedIssueId != null) {
      patch.issueId = params.matchedIssueId;
    }
    const upd = await this.attachments.update(
      {
        id: In(ids),
        workspaceId: params.workspaceId,
        channelId: params.channelId,
      },
      patch,
    );
    if ((upd.affected ?? 0) !== ids.length) {
      throw new BadRequestException('Attachment link conflict');
    }
  }

  /**
   * Bind staged uploads to a thread reply.
   */
  async linkStagingToReply(params: {
    workspaceId: number;
    channelId: number;
    uploadedById: number;
    messageReplyId: number;
    attachmentIds: number[] | undefined;
    matchedIssueId?: number;
  }): Promise<void> {
    const ids = uniq((params.attachmentIds ?? []).filter((n) => n > 0));
    if (ids.length === 0) {
      return;
    }
    const rows = await this.lockStagingRows(ids);
    if (rows.length !== ids.length) {
      throw new BadRequestException(
        'One or more attachments are unavailable, expired, or already linked',
      );
    }
    const minCreatedAt = this.stagingFreshnessCutoff();
    for (const row of rows) {
      this.assertStagingRowEligible(row, params, minCreatedAt);
    }
    const patch: Partial<Attachment> = {
      messageReplyId: params.messageReplyId,
    };
    if (params.matchedIssueId != null) {
      patch.issueId = params.matchedIssueId;
    }
    const upd = await this.attachments.update(
      {
        id: In(ids),
        workspaceId: params.workspaceId,
        channelId: params.channelId,
      },
      patch,
    );
    if ((upd.affected ?? 0) !== ids.length) {
      throw new BadRequestException('Attachment link conflict');
    }
  }

  /** Removes unlinked attachment rows older than TTL (S3 orphans are out of scope). */
  async purgeUnlinkedExpiredStaging(): Promise<number> {
    const cutoff = this.stagingFreshnessCutoff();
    const res = await this.attachments
      .createQueryBuilder()
      .delete()
      .from(Attachment)
      .where('message_id IS NULL')
      .andWhere('message_reply_id IS NULL')
      .andWhere('created_at < :cutoff', { cutoff })
      .execute();
    return res.affected ?? 0;
  }

  private stagingFreshnessCutoff(): Date {
    const hours = this.config.ATTACHMENT_STAGING_TTL_HOURS ?? 72;
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  private async lockStagingRows(ids: number[]): Promise<
    {
      id: number;
      workspace_id: number;
      channel_id: number | null;
      uploaded_by_id: number;
      message_id: number | null;
      message_reply_id: number | null;
      issue_id: number | null;
      created_at: Date;
    }[]
  > {
    return this.attachments.manager.query(
      `
      SELECT id, workspace_id, channel_id, uploaded_by_id, message_id, message_reply_id, issue_id, created_at
      FROM "${WORKSPACE_SCHEMA}".attachments
      WHERE id = ANY($1::int[])
      FOR UPDATE SKIP LOCKED
    `,
      [ids],
    );
  }

  private assertStagingRowEligible(
    row: {
      workspace_id: number;
      channel_id: number | null;
      uploaded_by_id: number;
      message_id: number | null;
      message_reply_id: number | null;
      issue_id: number | null;
      created_at: Date;
    },
    params: {
      workspaceId: number;
      channelId: number;
      uploadedById: number;
      matchedIssueId?: number;
    },
    minCreatedAt: Date,
  ): void {
    if (row.workspace_id !== params.workspaceId) {
      throw new BadRequestException('Attachment workspace mismatch');
    }
    if (row.channel_id !== params.channelId) {
      throw new BadRequestException('Attachment channel mismatch');
    }
    if (row.uploaded_by_id !== params.uploadedById) {
      throw new BadRequestException('Attachment uploader mismatch');
    }
    if (row.message_id != null || row.message_reply_id != null) {
      throw new BadRequestException('Attachment already linked');
    }
    if (row.created_at < minCreatedAt) {
      throw new BadRequestException('Attachment staging expired');
    }
    const issue = row.issue_id;
    if (params.matchedIssueId === undefined) {
      if (issue != null) {
        throw new BadRequestException('Attachment is scoped to an issue');
      }
    } else if (issue != null && issue !== params.matchedIssueId) {
      throw new BadRequestException('Attachment issue mismatch');
    }
  }

  private toDto(r: Attachment): UploadedAttachment {
    return {
      id: r.id,
      url: r.publicUrl,
      mimeType: r.mimeType,
      originalFilename: r.originalFilename,
      byteSize: Number(r.byteSize),
      uploadedById: r.uploadedById,
    } satisfies UploadedAttachment;
  }

  private toIssueListItemDto(r: Attachment): IIssueAttachmentListItem {
    return {
      ...this.toDto(r),
      issueId: r.issueId ?? null,
      messageId: r.messageId ?? null,
      messageReplyId: r.messageReplyId ?? null,
    };
  }
}
