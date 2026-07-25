import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { MessagePollBody, UploadedAttachment } from '@epicstory/contracts';
import { normalizeTiptapDoc } from '@epicstory/tiptap';
import type { JSONContent } from '@tiptap/core';
import { IsNull, Repository } from 'typeorm';
import { AppConfig } from 'src/core/app.config';
import { MessageDraft } from 'src/channel/domain/entities/message-draft.entity';
import {
  AttachmentReferencesService,
  attachmentAnchorKey,
} from './attachment-references.service';

export type MessageDraftDto = {
  id: number;
  workspaceId: number;
  channelId: number;
  authorId: number;
  threadMessageId: number | null;
  content: JSONContent;
  poll: MessagePollBody | null;
  quotedMessageId: number | null;
  quotedReplyId: number | null;
  version: number;
  expiresAt: string;
  updatedAt: string;
  attachments: UploadedAttachment[];
};

export type MessageDraftListItem = {
  id: number;
  workspaceId: number;
  channelId: number;
  threadMessageId: number | null;
  updatedAt: string;
  expiresAt: string;
  preview: string;
};

@Injectable()
export class MessageDraftService {
  constructor(
    @InjectRepository(MessageDraft)
    private readonly drafts: Repository<MessageDraft>,
    private readonly attachmentRefs: AttachmentReferencesService,
    private readonly config: AppConfig,
  ) {}

  async getOrNull(params: {
    channelId: number;
    authorId: number;
    threadMessageId?: number | null;
  }): Promise<MessageDraftDto | null> {
    const draft = await this.findDraft(params);
    if (!draft) return null;
    return this.toDto(draft);
  }

  async upsert(params: {
    workspaceId: number;
    channelId: number;
    authorId: number;
    threadMessageId?: number | null;
    content: JSONContent;
    poll?: MessagePollBody | null;
    quotedMessageId?: number | null;
    quotedReplyId?: number | null;
    attachmentIds?: number[];
    /** Client version for optimistic concurrency; omit / 0 on first create. */
    version?: number;
  }): Promise<
    | { ok: true; draft: MessageDraftDto }
    | { ok: false; conflict: MessageDraftDto | null }
  > {
    const threadMessageId = params.threadMessageId ?? null;
    let draft = await this.findDraft({
      channelId: params.channelId,
      authorId: params.authorId,
      threadMessageId,
    });

    const content = normalizeTiptapDoc(params.content);
    const expiresAt = this.nextExpiresAt();

    if (!draft) {
      if (params.version != null && params.version !== 0) {
        return { ok: false, conflict: null };
      }
      draft = this.drafts.create({
        workspaceId: params.workspaceId,
        channelId: params.channelId,
        authorId: params.authorId,
        threadMessageId,
        content,
        poll: params.poll ?? null,
        quotedMessageId: params.quotedMessageId ?? null,
        quotedReplyId: params.quotedReplyId ?? null,
        version: 1,
        expiresAt,
      });
      draft = await this.drafts.save(draft);
    } else {
      if (params.version == null || params.version !== draft.version) {
        return { ok: false, conflict: await this.toDto(draft) };
      }
      draft.content = content;
      if (params.poll !== undefined) draft.poll = params.poll;
      if (params.quotedMessageId !== undefined) {
        draft.quotedMessageId = params.quotedMessageId;
      }
      if (params.quotedReplyId !== undefined) {
        draft.quotedReplyId = params.quotedReplyId;
      }
      draft.version = draft.version + 1;
      draft.expiresAt = expiresAt;
      draft = await this.drafts.save(draft);
    }

    if (params.attachmentIds !== undefined) {
      await this.attachmentRefs.commit({
        workspaceId: params.workspaceId,
        channelId: params.channelId,
        actor: { uploadedById: params.authorId },
        ops: [
          {
            op: 'sync',
            anchor: { type: 'draft', draftId: draft.id },
            attachmentIds: params.attachmentIds,
          },
        ],
      });
    }

    return { ok: true, draft: await this.toDto(draft) };
  }

  async delete(params: {
    channelId: number;
    authorId: number;
    threadMessageId?: number | null;
    version?: number;
  }): Promise<
    | { ok: true }
    | {
        ok: false;
        reason: 'not_found' | 'conflict';
        conflict?: MessageDraftDto;
      }
  > {
    const draft = await this.findDraft(params);
    if (!draft) return { ok: false, reason: 'not_found' };
    if (params.version != null && params.version !== draft.version) {
      return {
        ok: false,
        reason: 'conflict',
        conflict: await this.toDto(draft),
      };
    }

    await this.attachmentRefs.commit({
      workspaceId: draft.workspaceId,
      channelId: draft.channelId,
      actor: { uploadedById: draft.authorId, trustedDelivery: true },
      ops: [{ op: 'release', anchor: { type: 'draft', draftId: draft.id } }],
    });
    await this.drafts.delete({ id: draft.id });
    return { ok: true };
  }

  async listForAuthor(params: {
    workspaceId: number;
    authorId: number;
  }): Promise<MessageDraftListItem[]> {
    const rows = await this.drafts.find({
      where: {
        workspaceId: params.workspaceId,
        authorId: params.authorId,
      },
      order: { updatedAt: 'DESC' },
      take: 100,
    });
    return rows.map((d) => ({
      id: d.id,
      workspaceId: d.workspaceId,
      channelId: d.channelId,
      threadMessageId: d.threadMessageId,
      updatedAt: d.updatedAt.toISOString(),
      expiresAt: d.expiresAt.toISOString(),
      preview: previewFromContent(d.content),
    }));
  }

  async countForAuthor(params: {
    workspaceId: number;
    authorId: number;
  }): Promise<number> {
    return this.drafts.count({
      where: {
        workspaceId: params.workspaceId,
        authorId: params.authorId,
      },
    });
  }

  /** Cron: delete expired drafts and eager-GC their attachments. */
  async purgeExpired(): Promise<number> {
    const expired = await this.drafts
      .createQueryBuilder('d')
      .where('d.expires_at < now()')
      .take(200)
      .getMany();

    let removed = 0;
    for (const draft of expired) {
      await this.attachmentRefs.commit({
        workspaceId: draft.workspaceId,
        channelId: draft.channelId,
        actor: { uploadedById: draft.authorId, trustedDelivery: true },
        ops: [{ op: 'release', anchor: { type: 'draft', draftId: draft.id } }],
      });
      await this.drafts.delete({ id: draft.id });
      removed += 1;
    }
    return removed;
  }

  async ensureDraft(params: {
    workspaceId: number;
    channelId: number;
    authorId: number;
    threadMessageId?: number | null;
  }): Promise<MessageDraftDto> {
    const existing = await this.getOrNull(params);
    if (existing) return existing;

    const result = await this.upsert({
      ...params,
      content: { type: 'doc', content: [] },
      version: 0,
      attachmentIds: [],
    });
    if (!result.ok || !result.draft) {
      throw new NotFoundException('Could not create draft');
    }
    return result.draft;
  }

  private async findDraft(params: {
    channelId: number;
    authorId: number;
    threadMessageId?: number | null;
  }): Promise<MessageDraft | null> {
    const threadMessageId = params.threadMessageId ?? null;
    return this.drafts.findOne({
      where: {
        channelId: params.channelId,
        authorId: params.authorId,
        threadMessageId: threadMessageId == null ? IsNull() : threadMessageId,
      },
    });
  }

  private nextExpiresAt(): Date {
    const hours = this.config.DRAFT_MESSAGE_TTL_HOURS ?? 72;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  private async toDto(draft: MessageDraft): Promise<MessageDraftDto> {
    const anchor = { type: 'draft' as const, draftId: draft.id };
    const { byAnchor } = await this.attachmentRefs.load({
      workspaceId: draft.workspaceId,
      anchors: [anchor],
    });
    const attachments = byAnchor.get(attachmentAnchorKey(anchor)) ?? [];
    return {
      id: draft.id,
      workspaceId: draft.workspaceId,
      channelId: draft.channelId,
      authorId: draft.authorId,
      threadMessageId: draft.threadMessageId,
      content: draft.content,
      poll: draft.poll ?? null,
      quotedMessageId: draft.quotedMessageId,
      quotedReplyId: draft.quotedReplyId,
      version: draft.version,
      expiresAt: draft.expiresAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
      attachments,
    };
  }
}

function previewFromContent(content: JSONContent): string {
  const texts: string[] = [];
  const walk = (node: JSONContent | undefined) => {
    if (!node) return;
    if (node.type === 'text' && typeof node.text === 'string') {
      texts.push(node.text);
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(content);
  return texts.join(' ').trim().slice(0, 120);
}
