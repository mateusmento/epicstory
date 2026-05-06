<script lang="ts" setup>
import type { User } from "@/domain/auth";
import { enrichMentionLabels, normalizeTiptapDoc } from "@epicstory/tiptap";
import type { JSONContent } from "@tiptap/core";
import { computed, provide } from "vue";
import { EPICSTORY_RICH_TEXT_PREVIEW, richTextJsonPreviewKey } from "./preview";
import RichTextSubtree from "./RichTextSubtree.vue";

const props = defineProps<{
  content: JSONContent;
  mentionedUsers?: User[];
  meId: number;
}>();

const usersById = computed(() => new Map((props.mentionedUsers ?? []).map((u) => [u.id, u])));

const normalizedDoc = computed(
  () =>
    (enrichMentionLabels(normalizeTiptapDoc(props.content), usersById.value) ??
      normalizeTiptapDoc(props.content)) as JSONContent,
);

function lookupUser(id: number): User | undefined {
  return usersById.value.get(id);
}

provide(richTextJsonPreviewKey, {
  mentionMeId: computed(() => props.meId),
  lookupUser,
});
</script>

<template>
  <div :class="`${EPICSTORY_RICH_TEXT_PREVIEW}`">
    <RichTextSubtree v-if="normalizedDoc.type === 'doc'" :node="normalizedDoc" />
  </div>
</template>
