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

  function replaceMap(mutate: (m: Map<number, IssueAttachmentListItem>) => void) {
    const next = new Map(byId.value);
    mutate(next);
    byId.value = next;
  }

  const flatList = computed(() => {
    const list = [...byId.value.values()];
    list.sort((a, b) => b.id - a.id);
    return list;
  });

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
    byAnchor,
    refreshAttachments,
    ingestFromActivity,
    removeAttachment,
    resolveAttachmentsForEntity,
  };
}
