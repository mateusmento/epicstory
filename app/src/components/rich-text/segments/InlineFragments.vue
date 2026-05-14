<script lang="ts" setup>
import type { IUser as IUser } from "@epicstory/contracts";
import type { JSONContent } from "@tiptap/core";
import MentionChip from "./MentionChip.vue";
import RichTextJsonMarkedSegment from "./MarkedSegment.vue";

const props = defineProps<{
  nodes: JSONContent[] | undefined;
  mentionMeId: number | undefined;
  userById: (id: number) => IUser | undefined;
}>();

function lookupUser(id: number): IUser | undefined {
  return props.userById(id);
}
</script>

<template>
  <template v-for="(seg, idx) in props.nodes ?? []" :key="idx">
    <br v-if="seg.type === 'hardBreak'" />
    <span v-else-if="seg.type === 'mention'" class="inline">
      <MentionChip :attrs="seg.attrs" :mention-me-id="props.mentionMeId" :user-by-id="lookupUser" />
    </span>
    <RichTextJsonMarkedSegment
      v-else-if="seg.type === 'text' && typeof seg.text === 'string'"
      :marks="seg.marks"
      :text="seg.text"
    />
  </template>
</template>
