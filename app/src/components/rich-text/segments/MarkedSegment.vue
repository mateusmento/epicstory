<script lang="ts" setup>
import type { JSONContent } from "@tiptap/core";
import { computed } from "vue";
/** Self-reference for recursive mark layering (avoid second `<script>` block). */
import RichTextMarkedTail from "./MarkedSegment.vue";

const props = defineProps<{
  text: string;
  marks?: JSONContent["marks"];
}>();

type MarkLite = NonNullable<typeof props.marks>[number];

const headMark = computed<MarkLite | undefined>(() => props.marks?.[0]);
const tailMarks = computed<MarkLite[]>(() => props.marks?.slice(1) ?? []);

const href = computed(() => String(headMark.value?.attrs?.href ?? ""));
</script>

<template>
  <template v-if="!headMark">
    {{ text }}
  </template>
  <strong v-else-if="headMark.type === 'bold'">
    <RichTextMarkedTail :marks="tailMarks" :text="text" />
  </strong>
  <em v-else-if="headMark.type === 'italic'">
    <RichTextMarkedTail :marks="tailMarks" :text="text" />
  </em>
  <u v-else-if="headMark.type === 'underline'">
    <RichTextMarkedTail :marks="tailMarks" :text="text" />
  </u>
  <s v-else-if="headMark.type === 'strike'">
    <RichTextMarkedTail :marks="tailMarks" :text="text" />
  </s>
  <a
    v-else-if="headMark.type === 'link'"
    class="text-blue-600 underline"
    rel="noopener noreferrer"
    target="_blank"
    :href="href"
  >
    <RichTextMarkedTail :marks="tailMarks" :text="text" />
  </a>
  <code v-else-if="headMark.type === 'code'" class="epic-inline-code font-mono">
    <RichTextMarkedTail :marks="tailMarks" :text="text" />
  </code>
  <RichTextMarkedTail v-else :marks="tailMarks" :text="text" />
</template>
