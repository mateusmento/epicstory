import { useDependency } from "@/core/dependency-injection";
import type { AsyncMutationState } from "@/lib/async";
import { defineStore, storeToRefs } from "pinia";
import { computed, reactive, ref } from "vue";
import { ChannelApi, IssueApi } from "@epicstory/api-client";
import type { IIssue, IMessage, IReply, UpdateIssueData } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";

export const useIssueStore = defineStore("issue", () => {
  const issue = ref<IIssue>();
  const patchState = reactive({
    busy: false,
    error: null as string | null,
  });
  return { issue, patchState };
});

export function useIssue() {
  const store = useIssueStore();
  const { issue } = storeToRefs(store);
  const issueApi = useDependency(IssueApi);
  const channelApi = useDependency(ChannelApi);

  const patchMutation = computed(
    (): AsyncMutationState => ({
      busy: store.patchState.busy,
      error: store.patchState.error,
    }),
  );

  async function fetchIssue(issueId: number) {
    store.patchState.error = null;
    store.issue = await issueApi.fetchIssue(issueId);
  }

  async function patchIssue(data: UpdateIssueData) {
    if (!store.issue) return;
    store.patchState.busy = true;
    store.patchState.error = null;
    try {
      store.issue = await issueApi.updateIssue(store.issue.id, data);
    } catch (e: unknown) {
      store.patchState.error = e instanceof Error ? e.message : "Failed to save changes";
    } finally {
      store.patchState.busy = false;
    }
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
    issue,
    patchMutation,
    fetchIssue,
    patchIssue,
    addAssignee,
    removeAssignee,
    addLabel,
    removeLabel,
    deleteIssueComment,
    updateIssueComment,
  };
}
