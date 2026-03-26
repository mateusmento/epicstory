<script setup lang="ts">
import { Button, Checkbox, MenuInput, MenuItem, MenuSeparator } from "@/design-system";
import { useLabels, type Label } from "@/domain/labels";
import { EditIcon, PlusIcon } from "lucide-vue-next";
import { computed, onMounted, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
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
const currentView = ref<"label-menu" | "color-menu">("label-menu");

const COLOR_PRESETS = {
  blue: "#3B82F6",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#A855F7",
  cyan: "#06B6D4",
  slate: "#64748B",
};

const { labels, fetchLabels, createLabel, updateLabel } = useLabels();

onMounted(() => {
  fetchLabels();
});

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return;
    await fetchLabels();
  },
  { immediate: false },
);

const isLabelSelected = (labelId: number) => (modelValue.value ?? []).includes(labelId);

const filteredLabels = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return labels.value;
  return labels.value.filter((l) => l.name.toLowerCase().includes(q));
});

function toggle(id: number) {
  const set = new Set(modelValue.value ?? []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  modelValue.value = Array.from(set);
}

async function onCreate(selectedColor: string) {
  const name = query.value.trim();
  if (!name) return;
  if (isCreating.value) return;
  isCreating.value = true;
  try {
    const created = await createLabel({ name, color: selectedColor });
    toggle(created.id);
    query.value = "";
  } finally {
    isCreating.value = false;
  }
}

const labelToEdit = ref<Label | null>(null);
function editLabel(label: Label | null) {
  labelToEdit.value = label;
  if (label) currentView.value = "color-menu";
  else currentView.value = "label-menu";
}

async function onEditLabel(event: MouseEvent, color: string) {
  event.preventDefault();
  const label = labelToEdit.value;
  if (!label) return;
  await updateLabel(label.id, { name: label.name, color });
  editLabel(null);
}
</script>

<template>
  <div class="w-64 min-h-14">
    <template v-if="currentView === 'label-menu'">
      <MenuInput v-model="query" placeholder="Search or create label…" auto-focus />

      <MenuSeparator />

      <MenuItem v-for="label in filteredLabels" :key="label.id" @click="toggle(label.id)">
        <Checkbox :model-value="isLabelSelected(label.id)" />
        <span class="h-2 w-2 rounded-full ring-1 ring-border" :style="{ backgroundColor: label.color }" />
        <span class="capitalize truncate">{{ label.name }}</span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Edit"
          @click.stop="editLabel(label)"
          class="ml-auto"
        >
          <EditIcon class="w-3 h-3" />
        </Button>
      </MenuItem>

      <MenuItem v-if="filteredLabels.length === 0" @select.prevent="currentView = 'color-menu'">
        <PlusIcon class="h-4 w-4" />
        Create label "{{ query }}"
      </MenuItem>
    </template>

    <template v-if="currentView === 'color-menu'">
      <MenuItem
        v-for="(color, colorName) in COLOR_PRESETS"
        :key="color"
        type="button"
        class="flex:row flex:center-y"
        :title="colorName"
        @click="labelToEdit ? onEditLabel($event, color) : onCreate(color)"
      >
        <div class="h-3 w-3 rounded-full" :style="{ backgroundColor: color }" />
        <span class="capitalize">{{ colorName }}</span>
      </MenuItem>
    </template>
  </div>
</template>
