import { useDependency } from "@/core/dependency-injection";
import type { AsyncDataView } from "@/lib/async";
import type { IssueAttachmentTileRow } from "@/lib/issues";
import type { ReadonlyRefOrGetter } from "@/utils";
import { IssueApi } from "@epicstory/api-client";
import type { IIssueAttachmentListItem, IMessage, IMessageAttachment, IReply } from "@epicstory/contracts";
import { computed, reactive, shallowRef, toValue, watch } from "vue";
import type { IIssueFeedItem } from "@epicstory/contracts";

export type { IssueAttachmentTileRow } from "@/lib/issues";

export type IssueAttachmentAnchorKey = `message:${number}` | `reply:${number}` | `issue:${number}`;

export type IssueAttachmentActivitySyncPayload = {
  feedItems?: IIssueFeedItem[];
  topLevelMessages?: IMessage[];
  replies?: IReply[];
};

export type IssueAttachmentPendingEntry =
  | { clientId: string; status: "uploading"; file: File; previewUrl: string }
  | {
      clientId: string;
      status: "failed";
      file: File;
      previewUrl: string;
      message?: string;
    };

function mergePreferExisting(
  cur: IIssueAttachmentListItem | undefined,
  next: IIssueAttachmentListItem,
): IIssueAttachmentListItem {
  if (!cur) return next;
  return {
    ...cur,
    ...next,
    issueId: next.issueId ?? cur.issueId,
    messageId: next.messageId ?? cur.messageId,
    messageReplyId: next.messageReplyId ?? cur.messageReplyId,
  };
}

export function useIssueAttachments({ issueId }: { issueId: ReadonlyRefOrGetter<number> }) {
  const issueApi = useDependency(IssueApi);

  const byId = shallowRef(new Map<number, IIssueAttachmentListItem>());
  const pendingUploads = shallowRef<IssueAttachmentPendingEntry[]>([]);

  function replaceMap(mutate: (m: Map<number, IIssueAttachmentListItem>) => void) {
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

  const attachmentsUploading = computed(() => pendingUploads.value.some((p) => p.status === "uploading"));

  const listState = reactive({
    loading: false,
    error: null as string | null,
  });

  const attachments = computed(
    (): AsyncDataView<IssueAttachmentTileRow[]> => ({
      data: attachmentTileRows.value,
      loading: listState.loading,
      error: listState.error,
    }),
  );

  async function loadAttachments(): Promise<void> {
    const id = toValue(issueId);
    if (!id) return;
    listState.loading = true;
    listState.error = null;
    try {
      await refreshAttachments();
    } catch (e: unknown) {
      listState.error = e instanceof Error ? e.message : "Could not load attachments";
    } finally {
      listState.loading = false;
    }
  }

  watch(
    () => toValue(issueId),
    (id) => {
      if (id) loadAttachments();
    },
    { immediate: true },
  );

  const byAnchor = computed(() => {
    const map = new Map<IssueAttachmentAnchorKey, IIssueAttachmentListItem[]>();
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
    const id = toValue(issueId);
    if (!id) return;
    const list = await issueApi.listIssueAttachments(id);
    replaceMap((m) => {
      m.clear();
      for (const item of list) {
        m.set(item.id, item);
      }
    });
  }

  function mergeAttachments(
    attachments: IMessageAttachment[],
    anchors: { issueId: number; messageId: number | null; messageReplyId: number | null },
  ) {
    if (attachments.length === 0) return;
    replaceMap((m) => {
      for (const att of attachments) {
        const item: IIssueAttachmentListItem = {
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
    mergeAttachments(message.attachments, {
      issueId,
      messageId: message.id,
      messageReplyId: null,
    });
  }

  function mergeReplyAttachments(reply: IReply, issueId: number) {
    if (!reply.attachments?.length) return;
    mergeAttachments(reply.attachments, {
      issueId,
      messageId: null,
      messageReplyId: reply.id,
    });
  }

  function ingestFromActivity(payload: IssueAttachmentActivitySyncPayload) {
    const id = toValue(issueId);
    if (!id) return;
    if (payload.feedItems) {
      for (const item of payload.feedItems) {
        if (item.type !== "comment_created") continue;
        mergeMessageAttachments(item.message, id);
        for (const r of item.replyPreviews ?? []) {
          mergeReplyAttachments(r, id);
        }
      }
    }
    if (payload.topLevelMessages) {
      for (const m of payload.topLevelMessages) mergeMessageAttachments(m, id);
    }
    if (payload.replies) {
      for (const r of payload.replies) mergeReplyAttachments(r, id);
    }
  }

  async function removeAttachment(attachmentId: number) {
    const id = toValue(issueId);
    if (!id) return;
    await issueApi.deleteIssueAttachment(id, attachmentId);
    replaceMap((m) => {
      m.delete(attachmentId);
    });
  }

  async function removePersistedAttachment(attachmentId: number): Promise<void> {
    listState.error = null;
    try {
      await removeAttachment(attachmentId);
    } catch (e: unknown) {
      listState.error = e instanceof Error ? e.message : "Could not remove attachment";
      await loadAttachments();
    }
  }

  function dismissPendingUpload(clientId: string) {
    revokeAndDropPending(clientId);
  }

  async function uploadIssueAttachmentFiles(
    files: File[],
    options?: { reloadFeed?: () => Promise<void> },
  ): Promise<void> {
    const id = toValue(issueId);
    if (!id || files.length === 0) return;

    listState.error = null;

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
          const dto = await issueApi.uploadAttachment(id, entry.file);
          replaceMap((m) => {
            m.set(dto.id, {
              ...dto,
              issueId: id,
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

  function resolveAttachmentsForEntity(entity: IMessage | IReply): IMessageAttachment[] {
    const id = toValue(issueId);
    if (!id) return entity.attachments ?? [];
    const key: IssueAttachmentAnchorKey =
      "messageId" in entity && entity.messageId != null ? `reply:${entity.id}` : `message:${entity.id}`;
    const fromStore = byAnchor.value.get(key);
    if (fromStore?.length) return fromStore;
    return entity.attachments ?? [];
  }

  return {
    flatList,
    attachmentTileRows,
    attachments,
    attachmentsUploading,
    byAnchor,
    refreshAttachments,
    loadAttachments,
    ingestFromActivity,
    removeAttachment,
    removePersistedAttachment,
    dismissPendingUpload,
    uploadIssueAttachmentFiles,
    resolveAttachmentsForEntity,
  };
}
