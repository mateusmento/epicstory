<script lang="ts" setup>
import type { User } from "@/domain/auth";
import { normalizeTiptapDoc } from "@epicstory/tiptap";
import type { JSONContent } from "@tiptap/core";
import { cloneDeep } from "lodash";
import { computed, provide } from "vue";
import { EPICSTORY_RICH_TEXT_PREVIEW, richTextJsonPreviewKey } from "./preview";
import RichTextSubtree from "./RichTextSubtree.vue";

const props = defineProps<{
  contentRich: JSONContent;
  mentionedUsers?: User[];
  meId: number;
}>();

const usersById = computed(() => new Map((props.mentionedUsers ?? []).map((u) => [u.id, u])));

function enrichMentionLabels(doc: JSONContent): JSONContent {
  const out = cloneDeep(doc) as JSONContent;
  const walk = (node: JSONContent) => {
    if (node.type === "mention" && node.attrs) {
      const id = Number(node.attrs.id ?? node.attrs.userId);
      if (Number.isFinite(id)) {
        const user = usersById.value.get(id);
        if (user) {
          node.attrs = { ...node.attrs, label: user.name };
        }
      }
    }
    if (node.content?.length) {
      for (const child of node.content) walk(child);
    }
  };
  walk(out);
  return out;
}

const normalizedDoc = computed(() => enrichMentionLabels(normalizeTiptapDoc(props.contentRich)));

function lookupUser(id: number): User | undefined {
  return usersById.value.get(id);
}

provide(richTextJsonPreviewKey, {
  mentionMeId: computed(() => props.meId),
  lookupUser,
});

function onMouseDownCapture(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (target?.closest("a")) return;
  if (target?.closest(".mention-chip")) return;
  if (target?.closest("[data-rich-text-json-code-expand],[data-rich-text-json-code-collapse]")) return;
  event.preventDefault();
}
</script>

<template>
  <div :class="`${EPICSTORY_RICH_TEXT_PREVIEW}`" tabindex="-1" @mousedown.capture="onMouseDownCapture">
    <RichTextSubtree v-if="normalizedDoc.type === 'doc'" :node="normalizedDoc" />
  </div>
</template>
