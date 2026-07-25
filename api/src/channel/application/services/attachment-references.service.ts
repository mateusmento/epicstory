import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UploadedAttachment } from '@epicstory/contracts';
import { uniq } from 'lodash';
import { Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { CHANNEL_SCHEMA } from 'src/channel/constants';
import { SCHEDULING_SCHEMA } from 'src/scheduling/constants';
import { Attachment } from 'src/workspace/domain/entities/attachment.entity';
import { AttachmentService } from 'src/workspace/application/services/attachment.service';
import {
  assertAssociateEligible,
  AttachmentReferenceRuleError,
} from 'src/channel/domain/rules/attachment-reference.rules';
import { Transactional } from 'typeorm-transactional';

export type AttachmentAnchor =
  | { type: 'message'; messageId: number }
  | { type: 'reply'; messageReplyId: number }
  | { type: 'draft'; draftId: number }
  | { type: 'scheduled'; scheduledJobId: string };

export type AttachmentReferenceActor = {
  uploadedById: number;
  /** Skip uploader match (scheduled delivery, trusted system paths). */
  trustedDelivery?: boolean;
};

export type AttachmentReferenceOp =
  | { op: 'sync'; anchor: AttachmentAnchor; attachmentIds: number[] }
  | { op: 'release'; anchor: AttachmentAnchor }
  /**
   * Detach every join for one attachment id, then eager GC.
   * Intentional destroy (channel files pane, issue attachment delete, purge).
   * Composer edit-remove must use anchor sync instead.
   */
  | { op: 'releaseAttachment'; attachmentId: number }
  /**
   * Cron backstop: unreferenced attachments older than grace.
   * Ignores channelId/actor for eligibility (workspace-wide).
   */
  | { op: 'reclaim'; graceHours?: number };

export type AttachmentReferencesCommitBatch = {
  workspaceId: number;
  channelId: number;
  actor: AttachmentReferenceActor;
  matchedIssueId?: number;
  ops: AttachmentReferenceOp[];
};

export type AttachmentReferencesCommitResult = {
  garbageCollectedIds: number[];
  effects: Array<
    | {
        op: 'sync' | 'release';
        anchor: AttachmentAnchor;
        attachmentIds: number[];
      }
    | { op: 'releaseAttachment'; attachmentId: number; detached: number[] }
    | { op: 'reclaim'; deleted: number }
  >;
};

function anchorKey(anchor: AttachmentAnchor): string {
  switch (anchor.type) {
    case 'message':
      return `message:${anchor.messageId}`;
    case 'reply':
      return `reply:${anchor.messageReplyId}`;
    case 'draft':
      return `draft:${anchor.draftId}`;
    case 'scheduled':
      return `scheduled:${anchor.scheduledJobId}`;
  }
}

function rethrowReferenceRule(err: unknown): never {
  if (err instanceof AttachmentReferenceRuleError) {
    throw new BadRequestException(err.message);
  }
  throw err;
}

@Injectable()
export class AttachmentReferencesService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachments: Repository<Attachment>,
    private readonly blobs: AttachmentService,
    private readonly config: AppConfig,
  ) {}

  async commit(
    batch: AttachmentReferencesCommitBatch,
  ): Promise<AttachmentReferencesCommitResult> {
    const garbageCollectedIds: number[] = [];
    const effects: AttachmentReferencesCommitResult['effects'] = [];

    for (const op of batch.ops) {
      if (op.op === 'sync') {
        const ids = await this.syncAnchor(batch, op.anchor, op.attachmentIds);
        effects.push({ op: 'sync', anchor: op.anchor, attachmentIds: ids });
      } else if (op.op === 'release') {
        const detached = await this.releaseAnchor(op.anchor);
        const gc = await this.gcIfUnreferenced(detached);
        garbageCollectedIds.push(...gc);
        effects.push({
          op: 'release',
          anchor: op.anchor,
          attachmentIds: detached,
        });
      } else if (op.op === 'releaseAttachment') {
        await this.detachAllJoinsForAttachment(op.attachmentId);
        const gc = await this.gcIfUnreferenced([op.attachmentId]);
        garbageCollectedIds.push(...gc);
        effects.push({
          op: 'releaseAttachment',
          attachmentId: op.attachmentId,
          detached: [op.attachmentId],
        });
      } else {
        const deleted = await this.reclaim(op.graceHours);
        effects.push({ op: 'reclaim', deleted });
      }
    }

    return {
      garbageCollectedIds: uniq(garbageCollectedIds.filter((n) => n > 0)),
      effects,
    };
  }

  async load(query: {
    workspaceId: number;
    anchors: AttachmentAnchor[];
  }): Promise<{ byAnchor: Map<string, UploadedAttachment[]> }> {
    const byAnchor = new Map<string, UploadedAttachment[]>();
    if (query.anchors.length === 0) return { byAnchor };

    for (const anchor of query.anchors) {
      const ids = await this.listIdsForAnchor(anchor);
      const items =
        ids.length === 0
          ? []
          : await this.blobs.listUploadedByIds(query.workspaceId, ids);
      byAnchor.set(anchorKey(anchor), items);
    }
    return { byAnchor };
  }

  /** Channel files pane: attachments with message or reply joins in this channel. */
  async listDeliveredForChannel(
    workspaceId: number,
    channelId: number,
    limit = 100,
  ): Promise<UploadedAttachment[]> {
    const rows = await this.attachments
      .createQueryBuilder('a')
      .where('a.workspace_id = :ws', { ws: workspaceId })
      .andWhere('a.channel_id = :ch', { ch: channelId })
      .andWhere(
        `(
          EXISTS (
            SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
            WHERE ma.attachment_id = a.id
          )
          OR EXISTS (
            SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
            WHERE mra.attachment_id = a.id
          )
        )`,
      )
      .orderBy('a.created_at', 'DESC')
      .take(Math.min(limit, 100))
      .getMany();
    return rows.map((r) => this.blobs.toUploadedDto(r));
  }

  async loadForMessages(
    workspaceId: number,
    messageIds: number[],
  ): Promise<Map<number, UploadedAttachment[]>> {
    const map = new Map<number, UploadedAttachment[]>();
    const ids = uniq(messageIds.filter(Boolean));
    if (ids.length === 0) return map;
    const { byAnchor } = await this.load({
      workspaceId,
      anchors: ids.map((messageId) => ({
        type: 'message' as const,
        messageId,
      })),
    });
    for (const messageId of ids) {
      map.set(messageId, byAnchor.get(`message:${messageId}`) ?? []);
    }
    return map;
  }

  async loadForReplies(
    workspaceId: number,
    replyIds: number[],
  ): Promise<Map<number, UploadedAttachment[]>> {
    const map = new Map<number, UploadedAttachment[]>();
    const ids = uniq(replyIds.filter(Boolean));
    if (ids.length === 0) return map;
    const { byAnchor } = await this.load({
      workspaceId,
      anchors: ids.map((messageReplyId) => ({
        type: 'reply' as const,
        messageReplyId,
      })),
    });
    for (const replyId of ids) {
      map.set(replyId, byAnchor.get(`reply:${replyId}`) ?? []);
    }
    return map;
  }

  async loadForScheduledJobs(
    workspaceId: number,
    scheduledJobIds: string[],
  ): Promise<Map<string, UploadedAttachment[]>> {
    const map = new Map<string, UploadedAttachment[]>();
    const ids = uniq(scheduledJobIds.filter(Boolean));
    if (ids.length === 0) return map;
    const { byAnchor } = await this.load({
      workspaceId,
      anchors: ids.map((scheduledJobId) => ({
        type: 'scheduled' as const,
        scheduledJobId,
      })),
    });
    for (const jobId of ids) {
      map.set(jobId, byAnchor.get(`scheduled:${jobId}`) ?? []);
    }
    return map;
  }

  /**
   * Thread root delete: release reply anchors then message anchor (eager GC inside).
   */
  async releaseThreadRoot(params: {
    messageId: number;
    replyIds: number[];
    workspaceId: number;
    channelId: number;
    actor: AttachmentReferenceActor;
  }): Promise<void> {
    const ops: AttachmentReferenceOp[] = [
      ...uniq(params.replyIds.filter((id) => id > 0)).map(
        (messageReplyId): AttachmentReferenceOp => ({
          op: 'release',
          anchor: { type: 'reply', messageReplyId },
        }),
      ),
      {
        op: 'release',
        anchor: { type: 'message', messageId: params.messageId },
      },
    ];
    await this.commit({
      workspaceId: params.workspaceId,
      channelId: params.channelId,
      actor: params.actor,
      ops,
    });
  }

  private async syncAnchor(
    batch: AttachmentReferencesCommitBatch,
    anchor: AttachmentAnchor,
    attachmentIds: number[],
  ): Promise<number[]> {
    const desired = uniq(attachmentIds.filter((n) => n > 0));
    const current = await this.listIdsForAnchor(anchor);
    const toAdd = desired.filter((id) => !current.includes(id));
    const toRemove = current.filter((id) => !desired.includes(id));

    if (toAdd.length > 0) {
      try {
        await this.associate(batch, anchor, toAdd);
      } catch (err) {
        rethrowReferenceRule(err);
      }
    }
    if (toRemove.length > 0) {
      await this.detachIdsFromAnchor(anchor, toRemove);
      await this.gcIfUnreferenced(toRemove);
    }
    return this.listIdsForAnchor(anchor);
  }

  private async releaseAnchor(anchor: AttachmentAnchor): Promise<number[]> {
    const ids = await this.listIdsForAnchor(anchor);
    if (ids.length === 0) return [];
    await this.detachIdsFromAnchor(anchor, ids);
    return ids;
  }

  private async associate(
    batch: AttachmentReferencesCommitBatch,
    anchor: AttachmentAnchor,
    attachmentIds: number[],
  ): Promise<void> {
    const rows = await this.blobs.lockRowsForAssociate(attachmentIds);
    if (rows.length !== attachmentIds.length) {
      throw new BadRequestException('One or more attachments are unavailable');
    }
    const actor = {
      workspaceId: batch.workspaceId,
      channelId: batch.channelId,
      uploadedById: batch.actor.uploadedById,
      trustedDelivery: batch.actor.trustedDelivery,
      matchedIssueId: batch.matchedIssueId,
    };
    for (const row of rows) {
      assertAssociateEligible(
        {
          workspaceId: row.workspace_id,
          channelId: row.channel_id,
          uploadedById: row.uploaded_by_id,
          issueId: row.issue_id,
        },
        actor,
      );
    }

    const { tableSql, parentColumn, parentId } = this.anchorJoinTarget(anchor);
    await this.insertJoinsIgnoreConflict(
      tableSql,
      parentColumn,
      parentId,
      attachmentIds,
    );

    if (batch.matchedIssueId != null) {
      await this.blobs.bindIssueId(
        batch.workspaceId,
        attachmentIds,
        batch.matchedIssueId,
      );
    }
  }

  private anchorJoinTarget(anchor: AttachmentAnchor): {
    tableSql: string;
    parentColumn: string;
    parentId: number | string;
  } {
    switch (anchor.type) {
      case 'message':
        return {
          tableSql: `"${CHANNEL_SCHEMA}".message_attachments`,
          parentColumn: 'message_id',
          parentId: anchor.messageId,
        };
      case 'reply':
        return {
          tableSql: `"${CHANNEL_SCHEMA}".message_reply_attachments`,
          parentColumn: 'message_reply_id',
          parentId: anchor.messageReplyId,
        };
      case 'draft':
        return {
          tableSql: `"${CHANNEL_SCHEMA}".message_draft_attachments`,
          parentColumn: 'draft_id',
          parentId: anchor.draftId,
        };
      case 'scheduled':
        return {
          tableSql: `"${SCHEDULING_SCHEMA}".scheduled_job_attachments`,
          parentColumn: 'scheduled_job_id',
          parentId: anchor.scheduledJobId,
        };
    }
  }

  private async listIdsForAnchor(anchor: AttachmentAnchor): Promise<number[]> {
    const { tableSql, parentColumn, parentId } = this.anchorJoinTarget(anchor);
    const rows: { attachment_id: number }[] =
      await this.attachments.manager.query(
        `
        SELECT attachment_id FROM ${tableSql}
        WHERE ${parentColumn} = $1
        ORDER BY attachment_id ASC
      `,
        [parentId],
      );
    return rows.map((r) => Number(r.attachment_id));
  }

  private async detachIdsFromAnchor(
    anchor: AttachmentAnchor,
    attachmentIds: number[],
  ): Promise<void> {
    if (attachmentIds.length === 0) return;
    const { tableSql, parentColumn, parentId } = this.anchorJoinTarget(anchor);
    await this.attachments.manager.query(
      `
      DELETE FROM ${tableSql}
      WHERE ${parentColumn} = $1 AND attachment_id = ANY($2::int[])
    `,
      [parentId, attachmentIds],
    );
  }

  private async detachAllJoinsForAttachment(
    attachmentId: number,
  ): Promise<void> {
    await this.attachments.manager.query(
      `
      DELETE FROM "${CHANNEL_SCHEMA}".message_attachments WHERE attachment_id = $1;
      DELETE FROM "${CHANNEL_SCHEMA}".message_reply_attachments WHERE attachment_id = $1;
      DELETE FROM "${CHANNEL_SCHEMA}".message_draft_attachments WHERE attachment_id = $1;
      DELETE FROM "${SCHEDULING_SCHEMA}".scheduled_job_attachments WHERE attachment_id = $1;
    `,
      [attachmentId],
    );
  }

  private async insertJoinsIgnoreConflict(
    tableSql: string,
    parentColumn: string,
    parentId: number | string,
    attachmentIds: number[],
  ): Promise<void> {
    if (attachmentIds.length === 0) return;
    await this.attachments.manager.query(
      `
      INSERT INTO ${tableSql} (${parentColumn}, attachment_id)
      SELECT $1, x
      FROM unnest($2::int[]) AS x
      ON CONFLICT DO NOTHING
    `,
      [parentId, attachmentIds],
    );
  }

  private async gcIfUnreferenced(attachmentIds: number[]): Promise<number[]> {
    const ids = uniq(attachmentIds.filter((n) => n > 0));
    if (ids.length === 0) return [];

    const candidates: Attachment[] = await this.attachments
      .createQueryBuilder('a')
      .where('a.id IN (:...ids)', { ids })
      .andWhere('a.issue_id IS NULL')
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
          WHERE ma.attachment_id = a.id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
          WHERE mra.attachment_id = a.id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${CHANNEL_SCHEMA}".message_draft_attachments mda
          WHERE mda.attachment_id = a.id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${SCHEDULING_SCHEMA}".scheduled_job_attachments sja
          WHERE sja.attachment_id = a.id
        )`,
      )
      .getMany();

    if (candidates.length === 0) return [];
    return this.blobs.deleteBlobsIfStillUnreferenced(
      candidates.map((c) => c.id),
    );
  }

  @Transactional()
  private async reclaim(graceHours?: number): Promise<number> {
    const hours =
      graceHours ?? this.config.ATTACHMENT_S3_ORPHAN_GRACE_HOURS ?? 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const candidates = await this.attachments
      .createQueryBuilder('a')
      .where('a.issue_id IS NULL')
      .andWhere('a.created_at < :cutoff', { cutoff })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${CHANNEL_SCHEMA}".message_attachments ma
          WHERE ma.attachment_id = a.id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${CHANNEL_SCHEMA}".message_reply_attachments mra
          WHERE mra.attachment_id = a.id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${CHANNEL_SCHEMA}".message_draft_attachments mda
          WHERE mda.attachment_id = a.id
        )`,
      )
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM "${SCHEDULING_SCHEMA}".scheduled_job_attachments sja
          WHERE sja.attachment_id = a.id
        )`,
      )
      .take(500)
      .getMany();

    if (candidates.length === 0) return 0;
    const deleted = await this.blobs.deleteBlobsIfStillUnreferenced(
      candidates.map((c) => c.id),
    );
    return deleted.length;
  }
}

export function attachmentAnchorKey(anchor: AttachmentAnchor): string {
  return anchorKey(anchor);
}
