<script lang="ts" setup>
import AttachmentTilesList from "@/presentationals/messages/AttachmentTilesList.vue";
import type { AttachmentTileRow } from "@/presentationals/messages/attachment-tile-rows";
import type { IssueAttachmentTileRow } from "@/lib/issues";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    rows: IssueAttachmentTileRow[];
    disabled?: boolean;
    removable?: boolean;
    meId?: number | null;
  }>(),
  {
    disabled: false,
    removable: false,
    meId: null,
  },
);

const emit = defineEmits<{
  remove: [attachmentId: number];
  dismissPending: [clientId: string];
}>();

const genericRows = computed((): AttachmentTileRow[] =>
  props.rows.map((row) => {
    if (row.kind === "persisted") {
      return { key: row.key, kind: "uploaded", attachment: row.item };
    }
    if (row.kind === "uploading") {
      return {
        key: row.key,
        kind: "uploading",
        clientId: row.clientId,
        file: row.file,
        previewUrl: row.previewUrl,
      };
    }
    return {
      key: row.key,
      kind: "failed",
      clientId: row.clientId,
      file: row.file,
      previewUrl: row.previewUrl,
      message: row.message,
    };
  }),
);
</script>

<template>
  <AttachmentTilesList
    aria-label="Issue attachments"
    :rows="genericRows"
    :disabled="disabled"
    :removable="removable"
    :me-id="meId"
    @remove="emit('remove', $event)"
    @dismiss-pending="emit('dismissPending', $event)"
  />
</template>
