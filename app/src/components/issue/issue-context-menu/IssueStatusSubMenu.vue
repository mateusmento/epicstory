<script setup lang="ts">
import { ContextMenuItem, ContextMenuSeparator } from "@/design-system";
import { Icon } from "@/design-system/icons";
import { computed } from "vue";
import { ref } from "vue";

const props = defineProps<{
  value: string | null | undefined;
}>();

const emit = defineEmits<{
  (e: "select", status: string): void;
}>();

type StatusOption = { value: string; label: string; dotClass: string };

const options = computed<StatusOption[]>(() => [
  { value: "backlog", label: "Backlog", dotClass: "bg-zinc-300" },
  { value: "todo", label: "Todo", dotClass: "bg-zinc-300" },
  { value: "doing", label: "In progress", dotClass: "bg-blue-500" },
  { value: "done", label: "Done", dotClass: "bg-emerald-500" },
]);

const query = ref("");
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return options.value;
  return options.value.filter((o) => o.label.toLowerCase().includes(q));
});

function onSelect(value: string) {
  emit("select", value);
}
</script>

<template>
  <div class="px-2 py-1" @click.stop @pointerdown.stop>
    <input
      v-model="query"
      type="text"
      class="h-8 w-full rounded-md border bg-transparent px-2 text-sm outline-none"
      placeholder="Search status…"
    />
  </div>
  <ContextMenuSeparator />

  <ContextMenuItem
    v-for="opt in filtered"
    :key="opt.value"
    class="flex items-center gap-2"
    @click="onSelect(opt.value)"
  >
    <span class="h-2 w-2 rounded-full ring-1 ring-border" :class="opt.dotClass" />
    <span class="flex-1">{{ opt.label }}</span>
    <Icon
      v-if="(props.value ?? 'todo') === opt.value"
      name="bi-check"
      class="h-4 w-4 text-muted-foreground"
    />
  </ContextMenuItem>
</template>
