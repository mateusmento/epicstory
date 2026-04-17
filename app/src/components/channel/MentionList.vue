<script lang="ts" setup>
import { UserAvatar } from "@/components/user";
import { useWorkspaceOnline } from "@/domain/channels";
import { ref, watch } from "vue";

export type MentionSuggestionItem = {
  id: number;
  label: string;
  picture?: string | null;
};

const props = defineProps<{
  items: MentionSuggestionItem[];
  command: (item: MentionSuggestionItem) => void;
}>();

const selectedIndex = ref(0);

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0;
  },
);

const { isUserOnline } = useWorkspaceOnline();

function onKeyDown({ event }: { event: KeyboardEvent }): boolean {
  if (event.key === "ArrowDown") {
    selectedIndex.value = Math.min(selectedIndex.value + 1, props.items.length - 1);
    return true;
  }
  if (event.key === "ArrowUp") {
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
    return true;
  }
  if (event.key === "Enter") {
    const item = props.items[selectedIndex.value];
    if (item) props.command(item);
    return true;
  }
  return false;
}

defineExpose({ onKeyDown });
</script>

<template>
  <div
    class="rounded-lg border border-border bg-popover text-popover-foreground shadow-md overflow-hidden w-80"
  >
    <div class="px-3 py-2 text-xs text-secondary-foreground border-b font-dmSans">Mention a person</div>

    <button
      v-for="(item, index) in items"
      :key="item.id"
      type="button"
      class="w-full flex gap-2 items-center px-3 py-2 text-left hover:bg-secondary transition-colors"
      :class="{ 'bg-secondary': index === selectedIndex }"
      @mousedown.prevent="command(item)"
    >
      <UserAvatar :name="item.label" :picture="item.picture" size="sm" variant="mentionRow" class="flex-shrink-0" />
      <div class="text-sm text-foreground font-lato min-w-0 truncate">
        {{ item.label }}
      </div>
      <div v-if="isUserOnline(item.id)" class="w-2 h-2 shrink-0 bg-green-400 rounded-full"></div>
    </button>
  </div>
</template>
