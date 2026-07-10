<script lang="ts" setup>
import { ScrollArea } from "@/design-system";
import { TicketIcon } from "lucide-vue-next";
import { ref, watch } from "vue";

export type SlashCommandItem = {
  id: string;
  label: string;
  description?: string;
};

const props = defineProps<{
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
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
  <div
    class="rounded-lg border border-border bg-popover text-popover-foreground shadow-md overflow-hidden w-72 flex flex-col max-h-[min(18rem,40vh)]"
  >
    <ScrollArea class="min-h-0 flex-1">
      <div class="p-1">
        <button
          v-for="(item, index) in props.items"
          :key="item.id"
          type="button"
          class="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
          :class="index === selectedIndex ? 'bg-muted' : ''"
          @mousedown.prevent
          @click="props.command(item)"
        >
          <TicketIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0">
            <span class="block font-medium">{{ item.label }}</span>
            <span v-if="item.description" class="block text-xs text-muted-foreground">{{
              item.description
            }}</span>
          </span>
        </button>
        <div v-if="props.items.length === 0" class="px-3 py-4 text-center text-xs text-muted-foreground">
          No commands
        </div>
      </div>
    </ScrollArea>
  </div>
</template>
