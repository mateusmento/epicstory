import { saveChannelDraft } from "@/domain/channels/composables/draft";
import { issueShareInitialContent } from "@/presentationals/rich-text/parse-issue-url";
import type { IIssue, IMessage, IssueReference } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { defineStore } from "pinia";
import { ref } from "vue";

export type ShareToChannelQuotedMessage = IMessage & {
  shareIssue?: IssueReference;
};

export type ShareToChannelSession = {
  channelId: number;
  /** TipTap doc to insert when the compose Chatbox opens (issue share). */
  initialContent?: JSONContent | null;
  quotedMessage?: ShareToChannelQuotedMessage | null;
};

export const useShareToChannelStore = defineStore("share-to-channel", () => {
  const pending = ref<ShareToChannelSession | null>(null);

  function beginIssueShare(channelId: number, issue: IIssue) {
    const content = issueShareInitialContent({
      id: issue.id,
      workspaceId: issue.workspaceId,
      projectId: issue.projectId,
      issueKey: issue.issueKey,
      title: issue.title,
      status: issue.status,
    });
    // Persist as draft so refresh / remount still has the badge; primary path is `initialContent`.
    saveChannelDraft(channelId, { content });
    pending.value = { channelId, initialContent: content, quotedMessage: null };
  }

  function beginCommentShare(
    channelId: number,
    comment: IMessage,
    issue: Pick<IIssue, "id" | "issueKey" | "title" | "status" | "projectId" | "workspaceId">,
  ) {
    pending.value = {
      channelId,
      initialContent: null,
      quotedMessage: {
        ...comment,
        shareIssue: {
          id: issue.id,
          issueKey: issue.issueKey,
          title: issue.title,
          status: issue.status,
          projectId: issue.projectId,
          workspaceId: issue.workspaceId,
        },
      },
    };
  }

  function consumePending(): ShareToChannelSession | null {
    const s = pending.value;
    pending.value = null;
    return s;
  }

  return {
    pending,
    beginIssueShare,
    beginCommentShare,
    consumePending,
  };
});
