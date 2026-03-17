<script setup lang="ts">
import { Button } from "@/design-system";
import type { Label } from "@/domain/labels";
import { useLabels } from "@/domain/labels";
import { computed, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    workspaceId: number;
    disabled?: boolean;
    placeholder?: string;
  }>(),
  {
    disabled: false,
    placeholder: "Labels",
  },
);

const modelValue = defineModel<number[]>({ default: [] });

const open = ref(false);
const query = ref("");
const isCreating = ref(false);
const selectedColor = ref("#3B82F6");

const COLOR_PRESETS = [
  "#3B82F6", // blue
  "#22C55E", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#A855F7", // purple
  "#06B6D4", // cyan
  "#64748B", // slate
];

const { labels, labelsById, fetchLabels, createLabel } = useLabels();

onMounted(() => {
  fetchLabels(props.workspaceId);
});

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return;
    await fetchLabels(props.workspaceId);
  },
  { immediate: false },
);

const selectedLabels = computed(() => {
  return (modelValue.value ?? [])
    .map((id) => labelsById.value.get(id))
    .filter((l): l is Label => Boolean(l))
    .sort((a, b) => a.name.localeCompare(b.name));
});

const filteredLabels = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return labels.value;
  return labels.value.filter((l) => l.name.toLowerCase().includes(q));
});

const canCreate = computed(() => {
  const q = query.value.trim();
  if (!q) return false;
  const exists = labels.value.some((l) => l.name.toLowerCase() === q.toLowerCase());
  return !exists;
});

function toggle(id: number) {
  const set = new Set(modelValue.value ?? []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  modelValue.value = Array.from(set);
}

async function onCreate() {
  const name = query.value.trim();
  if (!name) return;
  if (!canCreate.value) return;
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const created = await createLabel(props.workspaceId, { name, color: selectedColor.value });
    toggle(created.id);
    query.value = "";
  } finally {
    isCreating.value = false;
  }
}
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      v-model="query"
      type="text"
      class="h-8 flex-1 rounded-md border bg-white px-2 text-sm outline-none"
      placeholder="Search or create label…"
      @keydown.enter.prevent="onCreate"
    />
    <Button
      type="button"
      size="sm"
      variant="outline"
      class="h-8 px-2"
      :disabled="!canCreate || isCreating"
      @click="onCreate"
    >
      {{ isCreating ? "…" : "Create" }}
    </Button>
  </div>

  <div class="mt-2 flex items-center gap-1.5">
    <button
      v-for="c in COLOR_PRESETS"
      :key="c"
      type="button"
      class="h-5 w-5 rounded-full ring-1 ring-border"
      :style="{ backgroundColor: c }"
      :title="c"
      @click="selectedColor = c"
    >
      <span v-if="selectedColor === c" class="block h-full w-full rounded-full ring-2 ring-white" />
    </button>
    <div class="flex-1" />
    <div class="text-[11px] text-muted-foreground">color</div>
  </div>

  <div class="mt-2 max-h-56 overflow-auto rounded-md border bg-white">
    <button
      v-for="l in filteredLabels"
      :key="l.id"
      type="button"
      class="w-full px-2 py-1.5 text-left text-sm hover:bg-zinc-50 flex items-center gap-2"
      @click="toggle(l.id)"
    >
      <input type="checkbox" class="h-4 w-4" :checked="(modelValue ?? []).includes(l.id)" readonly />
      <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: l.color }" />
      <span class="truncate">{{ l.name }}</span>
    </button>
    <div v-if="filteredLabels.length === 0" class="px-2 py-6 text-center text-sm text-muted-foreground">
      No labels
    </div>
  </div>

  <div v-if="selectedLabels.length > 0" class="mt-2 flex flex-wrap gap-1">
    <div
      v-for="l in selectedLabels"
      :key="l.id"
      class="inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 text-[11px]"
    >
      <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: l.color }" />
      <span class="max-w-36 truncate">{{ l.name }}</span>
      <button
        type="button"
        class="text-muted-foreground hover:text-foreground"
        @click="toggle(l.id)"
        title="Remove"
      >
        ×
      </button>
    </div>
  </div>
</template>
