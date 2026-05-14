<script lang="ts" setup>
import type { IUser as IUser } from "@epicstory/contracts";
import { enrichMentionLabels, normalizeTiptapDoc } from "@epicstory/tiptap";
import type { JSONContent } from "@tiptap/core";
import { computed, provide } from "vue";
import { collectRichTextPreviewImages } from "./collect-preview-images";
import { EPICSTORY_RICH_TEXT_PREVIEW, richTextJsonPreviewKey } from "./preview";
import RichTextSubtree from "./RichTextSubtree.vue";

const props = defineProps<{
  content: JSONContent;
  mentionedUsers?: IUser[];
  meId: number;
}>();

const usersById = computed(() => new Map((props.mentionedUsers ?? []).map((u) => [u.id, u])));

const normalizedDoc = computed(
  () =>
    (enrichMentionLabels(normalizeTiptapDoc(props.content), usersById.value) ??
      normalizeTiptapDoc(props.content)) as JSONContent,
);

function lookupUser(id: number): IUser | undefined {
  return usersById.value.get(id);
}

const previewImageGallery = computed(() => collectRichTextPreviewImages(normalizedDoc.value));

provide(richTextJsonPreviewKey, {
  mentionMeId: computed(() => props.meId),
  lookupUser,
  previewImageGallery,
});
</script>

<template>
  <div :class="`${EPICSTORY_RICH_TEXT_PREVIEW}`">
    <RichTextSubtree v-if="normalizedDoc.type === 'doc'" :node="normalizedDoc" />
  </div>
</template>
