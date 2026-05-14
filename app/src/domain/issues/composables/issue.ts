import { useDependency } from "@/core/dependency-injection";
import { defineStore, storeToRefs } from "pinia";
import { ref } from "vue";
import { ChannelApi, IssueApi } from "@epicstory/api-client";
import type { IIssue, IMessage, IReply, UpdateIssueData } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";

export const useIssueStore = defineStore("issue", () => {
  const issue = ref<IIssue>();
  return { issue };
});

export function useIssue() {
  const store = useIssueStore();
  const issueApi = useDependency(IssueApi);
  const channelApi = useDependency(ChannelApi);

  async function fetchIssue(issueId: number) {
    store.issue = await issueApi.fetchIssue(issueId);
  }

  async function updateIssue(data: UpdateIssueData) {
    if (!store.issue) return;
    store.issue = await issueApi.updateIssue(store.issue.id, data);
  }

  async function addAssignee(userId: number) {
    if (!store.issue) return;
    store.issue = await issueApi.addAssignee(store.issue.id, userId);
  }

  async function removeAssignee(userId: number) {
    if (!store.issue) return;
    store.issue = await issueApi.removeAssignee(store.issue.id, userId);
  }

  async function addLabel(labelId: number) {
    if (!store.issue) return;
    store.issue = await issueApi.addLabel(store.issue.id, labelId);
  }

  async function removeLabel(labelId: number) {
    if (!store.issue) return;
    store.issue = await issueApi.removeLabel(store.issue.id, labelId);
  }

  async function deleteIssueComment(entity: IMessage | IReply) {
    if ("messageId" in entity && entity.messageId != null) {
      await channelApi.deleteReply(entity.id);
      return;
    }
    await channelApi.deleteMessage(entity.id);
  }

  async function updateIssueComment(
    entity: IMessage | IReply,
    content: JSONContent,
    attachmentIds?: number[],
  ) {
    const body = {
      content,
      ...(attachmentIds != null && attachmentIds.length > 0 ? { attachmentIds } : {}),
    };
    if ("messageId" in entity && entity.messageId != null) {
      return channelApi.updateReply(entity.id, body);
    }
    return channelApi.updateMessage(entity.id, body);
  }

  return {
    ...storeToRefs(store),
    fetchIssue,
    updateIssue,
    addAssignee,
    removeAssignee,
    addLabel,
    removeLabel,
    deleteIssueComment,
    updateIssueComment,
  };
}
