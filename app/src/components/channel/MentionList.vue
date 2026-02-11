<script lang="ts" setup>
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
  <div class="z-50 rounded-lg border bg-white shadow-lg overflow-hidden w-80">
    <div class="px-3 py-2 text-xs text-secondary-foreground border-b font-dmSans">Mention a person</div>

    <button
      v-for="(item, index) in items"
      :key="item.id"
      type="button"
      class="w-full flex gap-2 items-center px-3 py-2 text-left hover:bg-secondary transition-colors"
      :class="{ 'bg-secondary': index === selectedIndex }"
      @mousedown.prevent="command(item)"
    >
      <div
        class="w-7 h-7 rounded-full flex-shrink-0 bg-zinc-300 flex items-center justify-center text-zinc-600 font-semibold text-xs overflow-hidden"
      >
        <img v-if="item.picture" :src="item.picture" :alt="item.label" class="w-7 h-7 object-cover" />
        <template v-else>{{ item.label.charAt(0).toUpperCase() }}</template>
      </div>

      <div class="flex-1 min-w-0">
        <div class="text-sm text-foreground font-lato truncate">{{ item.label }}</div>
        <div class="text-xs text-secondary-foreground font-dmSans">ID: {{ item.id }}</div>
      </div>
    </button>
  </div>
</template>
