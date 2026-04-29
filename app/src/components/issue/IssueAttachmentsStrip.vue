<script lang="ts" setup>
import ChannelAttachmentStrip from "@/components/channel/ChannelAttachmentStrip.vue";
import { useDependency } from "@/core/dependency-injection";
import { IssueApi, type UploadedAttachment } from "@/domain/issues/api";
import { ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    issueId: number;
    /** Sidebar: no heavy border, optional title */
    compact?: boolean;
    hideHeading?: boolean;
  }>(),
  {
    compact: false,
    hideHeading: false,
  },
);

const issueApi = useDependency(IssueApi);
const attachments = ref<UploadedAttachment[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

watch(
  () => props.issueId,
  async (id) => {
    loading.value = true;
    error.value = null;
    try {
      attachments.value = await issueApi.listIssueAttachments(id);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "Could not load files";
      attachments.value = [];
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);

</script>

<template>
  <section
    :class="[
      'flex flex-col gap-2',
      compact ? 'rounded-lg border border-border/80 bg-muted/10 px-2 py-2' : 'rounded-lg border border-border bg-muted/20 px-3 py-2.5',
    ]"
  >
    <div v-if="!hideHeading" class="flex items-center justify-between gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-foreground">Files</h3>
    </div>
    <div v-if="error" class="text-xs text-red-600">{{ error }}</div>
    <div v-else-if="loading" class="text-xs text-muted-foreground">Loading attachments…</div>
    <div
      v-else-if="attachments.length"
      class="max-h-[min(40vh,28rem)] overflow-y-auto overscroll-contain pr-0.5"
    >
      <ChannelAttachmentStrip :files="attachments" />
    </div>
    <p v-else class="text-xs text-muted-foreground">No attachments on this issue yet.</p>
  </section>
</template>
