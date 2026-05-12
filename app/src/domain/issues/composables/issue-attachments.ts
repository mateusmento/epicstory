import type { IMessage, IReply } from "@/domain/channels";
import type { MessageAttachmentDto } from "@/domain/channels/types/message.type";
import { computed, shallowRef, toValue, type MaybeRefOrGetter } from "vue";
import type { IssueApi, IssueAttachmentListItem } from "../api/issue.api";
import type { IssueFeedItem } from "../types/issue-feed.type";

export type IssueAttachmentAnchorKey = `message:${number}` | `reply:${number}` | `issue:${number}`;

export type IssueAttachmentActivitySyncPayload = {
  feedItems?: IssueFeedItem[];
  topLevelMessages?: IMessage[];
  replies?: IReply[];
};

/** In-flight or failed optimistic rows shown above persisted attachments. */
export type IssueAttachmentPendingEntry =
  | { clientId: string; status: "uploading"; file: File; previewUrl: string }
  | {
      clientId: string;
      status: "failed";
      file: File;
      previewUrl: string;
      message?: string;
    };

export type IssueAttachmentTileRow =
  | { key: string; kind: "persisted"; item: IssueAttachmentListItem }
  | {
      key: string;
      kind: "uploading";
      clientId: string;
      file: File;
      previewUrl: string;
    }
  | {
      key: string;
      kind: "failed";
      clientId: string;
      file: File;
      previewUrl: string;
      message?: string;
    };

function mergePreferExisting(
  cur: IssueAttachmentListItem | undefined,
  next: IssueAttachmentListItem,
): IssueAttachmentListItem {
  if (!cur) return next;
  return {
    ...cur,
    ...next,
    issueId: next.issueId ?? cur.issueId,
    messageId: next.messageId ?? cur.messageId,
    messageReplyId: next.messageReplyId ?? cur.messageReplyId,
  };
}

/**
 * Returns only refs/computed refs and plain functions — safe to destructure without losing reactivity.
 */
export function useIssueAttachments(deps: { issueApi: IssueApi; issueId: MaybeRefOrGetter<number> }) {
  const byId = shallowRef(new Map<number, IssueAttachmentListItem>());
  const pendingUploads = shallowRef<IssueAttachmentPendingEntry[]>([]);

  function replaceMap(mutate: (m: Map<number, IssueAttachmentListItem>) => void) {
    const next = new Map(byId.value);
    mutate(next);
    byId.value = next;
  }

  function revokeAndDropPending(clientId: string) {
    const entry = pendingUploads.value.find((p) => p.clientId === clientId);
    if (entry) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    pendingUploads.value = pendingUploads.value.filter((p) => p.clientId !== clientId);
  }

  const flatList = computed(() => {
    const list = [...byId.value.values()];
    list.sort((a, b) => b.id - a.id);
    return list;
  });

  const attachmentTileRows = computed((): IssueAttachmentTileRow[] => {
    const pendingRows: IssueAttachmentTileRow[] = pendingUploads.value.map((p) =>
      p.status === "uploading"
        ? {
            key: `u:${p.clientId}`,
            kind: "uploading",
            clientId: p.clientId,
            file: p.file,
            previewUrl: p.previewUrl,
          }
        : {
            key: `f:${p.clientId}`,
            kind: "failed",
            clientId: p.clientId,
            file: p.file,
            previewUrl: p.previewUrl,
            message: p.message,
          },
    );
    const persistedRows: IssueAttachmentTileRow[] = flatList.value.map((item) => ({
      key: `a:${item.id}`,
      kind: "persisted",
      item,
    }));
    return [...pendingRows, ...persistedRows];
  });

  const attachmentsUploading = computed(() =>
    pendingUploads.value.some((p) => p.status === "uploading"),
  );

  const byAnchor = computed(() => {
    const map = new Map<IssueAttachmentAnchorKey, IssueAttachmentListItem[]>();
    for (const a of flatList.value) {
      let key: IssueAttachmentAnchorKey | null = null;
      if (a.messageReplyId != null) key = `reply:${a.messageReplyId}`;
      else if (a.messageId != null) key = `message:${a.messageId}`;
      else if (a.issueId != null) key = `issue:${a.issueId}`;
      if (key == null) continue;
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list);
    }
    return map;
  });

  async function refreshAttachments() {
    const id = toValue(deps.issueId);
    if (!id) return;
    const list = await deps.issueApi.listIssueAttachments(id);
    replaceMap((m) => {
      m.clear();
      for (const item of list) {
        m.set(item.id, item);
      }
    });
  }

  function mergeAttachmentDtos(
    dtos: MessageAttachmentDto[],
    anchors: { issueId: number; messageId: number | null; messageReplyId: number | null },
  ) {
    if (dtos.length === 0) return;
    replaceMap((m) => {
      for (const att of dtos) {
        const item: IssueAttachmentListItem = {
          ...att,
          issueId: anchors.issueId,
          messageId: anchors.messageId,
          messageReplyId: anchors.messageReplyId,
        };
        m.set(item.id, mergePreferExisting(m.get(item.id), item));
      }
    });
  }

  function mergeMessageAttachments(message: IMessage | null, issueId: number) {
    if (!message?.attachments?.length) return;
    mergeAttachmentDtos(message.attachments, {
      issueId,
      messageId: message.id,
      messageReplyId: null,
    });
  }

  function mergeReplyAttachments(reply: IReply, issueId: number) {
    if (!reply.attachments?.length) return;
    mergeAttachmentDtos(reply.attachments, {
      issueId,
      messageId: null,
      messageReplyId: reply.id,
    });
  }

  function ingestFromActivity(payload: IssueAttachmentActivitySyncPayload) {
    const issueId = toValue(deps.issueId);
    if (!issueId) return;
    if (payload.feedItems) {
      for (const item of payload.feedItems) {
        if (item.type !== "comment_created") continue;
        mergeMessageAttachments(item.message, issueId);
        for (const r of item.replyPreviews ?? []) {
          mergeReplyAttachments(r, issueId);
        }
      }
    }
    if (payload.topLevelMessages) {
      for (const m of payload.topLevelMessages) mergeMessageAttachments(m, issueId);
    }
    if (payload.replies) {
      for (const r of payload.replies) mergeReplyAttachments(r, issueId);
    }
  }

  async function removeAttachment(attachmentId: number) {
    const id = toValue(deps.issueId);
    if (!id) return;
    await deps.issueApi.deleteIssueAttachment(id, attachmentId);
    replaceMap((m) => {
      m.delete(attachmentId);
    });
  }

  function dismissPendingUpload(clientId: string) {
    revokeAndDropPending(clientId);
  }

  async function uploadIssueAttachmentFiles(
    files: File[],
    options?: { reloadFeed?: () => Promise<void> },
  ): Promise<void> {
    const issueId = toValue(deps.issueId);
    if (!issueId || files.length === 0) return;

    const additions: IssueAttachmentPendingEntry[] = files.map((file) => ({
      clientId: crypto.randomUUID(),
      status: "uploading",
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    pendingUploads.value = [...additions, ...pendingUploads.value];

    await Promise.all(
      additions.map(async (entry) => {
        try {
          const dto = await deps.issueApi.uploadAttachment(issueId, entry.file);
          replaceMap((m) => {
            m.set(dto.id, {
              ...dto,
              issueId,
              messageId: null,
              messageReplyId: null,
            });
          });
          revokeAndDropPending(entry.clientId);
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Upload failed";
          pendingUploads.value = pendingUploads.value.map((p) =>
            p.clientId === entry.clientId && p.status === "uploading"
              ? { ...p, status: "failed" as const, message }
              : p,
          );
        }
      }),
    );

    await options?.reloadFeed?.();
  }

  function resolveAttachmentsForEntity(entity: IMessage | IReply): MessageAttachmentDto[] {
    const issueId = toValue(deps.issueId);
    if (!issueId) return entity.attachments ?? [];
    const key: IssueAttachmentAnchorKey =
      "messageId" in entity && entity.messageId != null ? `reply:${entity.id}` : `message:${entity.id}`;
    const fromStore = byAnchor.value.get(key);
    if (fromStore?.length) return fromStore;
    return entity.attachments ?? [];
  }

  return {
    flatList,
    attachmentTileRows,
    attachmentsUploading,
    byAnchor,
    refreshAttachments,
    ingestFromActivity,
    removeAttachment,
    dismissPendingUpload,
    uploadIssueAttachmentFiles,
    resolveAttachmentsForEntity,
  };
}
