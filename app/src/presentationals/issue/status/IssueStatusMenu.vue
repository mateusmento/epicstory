<script setup lang="ts">
import { MenuInput, MenuItem, MenuSeparator } from "@/design-system";
import { Check } from "lucide-vue-next";
import { computed, ref } from "vue";
import { issueStatusDotClass } from "./status-fns";

const props = defineProps<{
  value: string | null | undefined;
}>();

const emit = defineEmits<{
  (e: "select", status: string): void;
}>();

type StatusOption = { value: string; label: string };

const options = computed<StatusOption[]>(() => [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "Todo" },
  { value: "doing", label: "In progress" },
  { value: "done", label: "Done" },
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
  <div>
    <MenuInput v-model="query" placeholder="Search status…" auto-focus />

    <MenuSeparator />

    <MenuItem
      v-for="opt in filtered"
      :key="opt.value"
      class="flex items-center gap-2 text-xs"
      @click="onSelect(opt.value)"
    >
      <span class="h-2 w-2 rounded-full ring-1 ring-border" :class="issueStatusDotClass(opt.value)" />
      <span class="flex-1">{{ opt.label }}</span>

      <Check v-if="(props.value ?? 'todo') === opt.value" class="w-4 h-4 text-muted-foreground" />
    </MenuItem>
  </div>
</template>
