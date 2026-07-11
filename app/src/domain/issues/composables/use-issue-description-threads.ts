import { useDependency } from "@/core/dependency-injection";
import { IssueApi } from "@epicstory/api-client";
import type {
  CreateDescriptionThreadBody,
  DescriptionThreadStatus,
  IDescriptionThread,
  UpdateDescriptionThreadBody,
} from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import { computed, markRaw, reactive, ref, watch, type Ref } from "vue";

export function useIssueDescriptionThreads(issueId: Ref<number | null>) {
  const issueApi = useDependency(IssueApi);

  const state = reactive({
    data: [] as IDescriptionThread[],
    loading: false,
    error: null as string | null,
    busy: false,
  });

  const openThreads = computed(() => state.data.filter((t) => t.status === "open"));
  const activeMarkId = ref<string | null>(null);

  async function reload() {
    const id = issueId.value;
    if (id == null) {
      state.data = [];
      return;
    }
    state.loading = true;
    state.error = null;
    try {
      state.data = await issueApi.listDescriptionThreads(id);
    } catch (e: unknown) {
      state.data = [];
      state.error = e instanceof Error ? e.message : "Could not load description threads";
    } finally {
      state.loading = false;
    }
  }

  watch(
    issueId,
    () => {
      reload();
    },
    { immediate: true },
  );

  async function createThread(body: CreateDescriptionThreadBody): Promise<IDescriptionThread | null> {
    const id = issueId.value;
    if (id == null || state.busy) return null;
    state.busy = true;
    state.error = null;
    try {
      const thread = await issueApi.createDescriptionThread(id, body);
      state.data = [...state.data.filter((t) => t.id !== thread.id), thread];
      return thread;
    } catch (e: unknown) {
      state.error = e instanceof Error ? e.message : "Could not create thread";
      return null;
    } finally {
      state.busy = false;
    }
  }

  async function reply(threadId: number, content: JSONContent): Promise<IDescriptionThread | null> {
    const id = issueId.value;
    if (id == null || state.busy) return null;
    state.busy = true;
    try {
      const thread = await issueApi.addDescriptionThreadMessage(id, threadId, { content });
      state.data = state.data.map((t) => (t.id === thread.id ? thread : t));
      return thread;
    } catch (e: unknown) {
      state.error = e instanceof Error ? e.message : "Could not reply";
      return null;
    } finally {
      state.busy = false;
    }
  }

  async function updateStatus(
    threadId: number,
    status: DescriptionThreadStatus,
    description?: JSONContent,
  ): Promise<IDescriptionThread | null> {
    const id = issueId.value;
    if (id == null || state.busy) return null;
    state.busy = true;
    try {
      const body: UpdateDescriptionThreadBody = { status, ...(description ? { description } : {}) };
      const thread = await issueApi.updateDescriptionThread(id, threadId, body);
      state.data = state.data.map((t) => (t.id === thread.id ? thread : t));
      return thread;
    } catch (e: unknown) {
      state.error = e instanceof Error ? e.message : "Could not update thread";
      return null;
    } finally {
      state.busy = false;
    }
  }

  async function deleteThread(threadId: number): Promise<string | null> {
    const id = issueId.value;
    if (id == null || state.busy) return null;
    state.busy = true;
    try {
      const { markId } = await issueApi.deleteDescriptionThread(id, threadId);
      state.data = state.data.filter((t) => t.id !== threadId);
      return markId;
    } catch (e: unknown) {
      state.error = e instanceof Error ? e.message : "Could not delete thread";
      return null;
    } finally {
      state.busy = false;
    }
  }

  async function deleteMessage(
    threadId: number,
    messageId: number,
  ): Promise<{ deletedThread: boolean; markId: string | null } | null> {
    const id = issueId.value;
    if (id == null || state.busy) return null;
    state.busy = true;
    try {
      const result = await issueApi.deleteDescriptionThreadMessage(id, threadId, messageId);
      if (result.deletedThread) {
        state.data = state.data.filter((t) => t.id !== threadId);
      } else {
        state.data = state.data.map((t) => {
          if (t.id !== threadId) return t;
          return { ...t, messages: t.messages.filter((m) => m.id !== messageId) };
        });
      }
      return result;
    } catch (e: unknown) {
      state.error = e instanceof Error ? e.message : "Could not delete message";
      return null;
    } finally {
      state.busy = false;
    }
  }

  return reactive({
    state,
    openThreads,
    activeMarkId,
    reload: markRaw(reload),
    createThread: markRaw(createThread),
    reply: markRaw(reply),
    updateStatus: markRaw(updateStatus),
    deleteThread: markRaw(deleteThread),
    deleteMessage: markRaw(deleteMessage),
  });
}

export type IssueDescriptionThreadsApi = ReturnType<typeof useIssueDescriptionThreads>;
