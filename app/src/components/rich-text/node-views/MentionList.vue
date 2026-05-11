<script lang="ts" setup>
import { UserAvatar } from "@/components/user";
import { ScrollArea } from "@/design-system";
import { useWorkspaceOnline } from "@/domain/channels";
import { ref, watch } from "vue";

export type MentionSuggestionItem = {
  id: number;
  label: string;
  picture?: string | null;
};

const props = withDefaults(
  defineProps<{
    items: MentionSuggestionItem[];
    command: (item: MentionSuggestionItem) => void;
    /** When set, ScrollArea emits reached-bottom → load more (e.g. workspace members). */
    onReachedBottom?: () => void | Promise<void>;
    /** When false, further loads are skipped (parent-driven pagination). */
    hasMore?: boolean;
    isLoadingMore?: boolean;
  }>(),
  {
    hasMore: true,
    isLoadingMore: false,
  },
);

const selectedIndex = ref(0);

watch(
  () => props.items,
  () => {
    selectedIndex.value = 0;
  },
);

const { isUserOnline } = useWorkspaceOnline();

async function handleReachedBottom() {
  if (!props.onReachedBottom || props.isLoadingMore || props.hasMore === false) return;
  await props.onReachedBottom();
}

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
    class="rounded-lg border border-border bg-popover text-popover-foreground shadow-md overflow-hidden w-80 flex flex-col max-h-[min(22rem,50vh)]"
  >
    <div class="px-3 py-2 text-xs text-secondary-foreground border-b font-dmSans shrink-0">
      Mention a person
    </div>

    <ScrollArea class="h-52 min-h-0 w-full" @reached-bottom="handleReachedBottom">
      <div class="!block">
        <button
          v-for="(item, index) in items"
          :key="item.id"
          type="button"
          class="w-full flex gap-2 items-center px-3 py-2 text-left hover:bg-secondary transition-colors"
          :class="{ 'bg-secondary': index === selectedIndex }"
          @mousedown.prevent="command(item)"
        >
          <UserAvatar
            :name="item.label"
            :picture="item.picture"
            size="sm"
            variant="mentionRow"
            class="flex-shrink-0"
          />
          <div class="text-sm text-foreground font-lato min-w-0 truncate">
            {{ item.label }}
          </div>
          <div v-if="isUserOnline(item.id)" class="w-2 h-2 shrink-0 bg-green-400 rounded-full"></div>
        </button>

        <div v-if="isLoadingMore" class="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
        <div v-else-if="items.length === 0" class="px-3 py-2 text-xs text-muted-foreground">No matches</div>
        <div v-else-if="onReachedBottom && !hasMore" class="px-3 py-2 text-xs text-muted-foreground">
          End of results
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
