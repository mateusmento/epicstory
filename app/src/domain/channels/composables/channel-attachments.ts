import { useDependency } from "@/core/dependency-injection";
import { ChannelApi } from "@epicstory/api-client";
import type { UploadedAttachment } from "@epicstory/contracts";
import type { Ref } from "vue";
import { markRaw, reactive, ref, watch } from "vue";

export function useChannelAttachments(channelId: Ref<number | undefined>) {
  const channelApi = useDependency(ChannelApi);

  const attachments = reactive({
    data: null as UploadedAttachment[] | null,
    loading: false,
    error: null as string | null,
  });

  const removingAttachmentId = ref<number | null>(null);

  async function load(id: number): Promise<void> {
    attachments.loading = true;
    attachments.error = null;
    try {
      attachments.data = await channelApi.listChannelAttachments(id);
    } catch {
      attachments.data = [];
      attachments.error = "Could not load attachments";
    } finally {
      attachments.loading = false;
    }
  }

  function clear(): void {
    attachments.data = [];
    attachments.error = null;
  }

  watch(
    channelId,
    (id) => {
      if (id == null) {
        clear();
        return;
      }
      load(id);
    },
    { immediate: true },
  );

  async function remove(attachmentId: number): Promise<void> {
    const id = channelId.value;
    if (id == null) return;

    removingAttachmentId.value = attachmentId;
    attachments.error = null;
    try {
      await channelApi.deleteChannelAttachment(id, attachmentId);
      attachments.data = (attachments.data ?? []).filter((a) => a.id !== attachmentId);
    } catch {
      attachments.error = "Could not remove attachment";
      try {
        attachments.data = await channelApi.listChannelAttachments(id);
      } catch {
        /* keep stale list */
      }
    } finally {
      removingAttachmentId.value = null;
    }
  }

  return reactive({
    attachments,
    removingAttachmentId,
    remove: markRaw(remove),
  });
}
